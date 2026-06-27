const router = require('express').Router();
const OpenAI = require('openai');
const pool = require('../db');
const auth = require('../middleware/auth');

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

const SYSTEM = `Sen Türkiye'nin en iyi KPSS öğretmenisin. 
Her zaman Türkçe cevap ver.
KPSS sınavı formatına hakim, gerçek KPSS sorularının stilini biliyorsun.
Açıklamaların net, öğretici ve ezber dostu olmalı.
Sorular gerçek KPSS zorluğunda olmalı — ne çok kolay ne çok zor.`;

async function ask(messages, maxTokens = 2000) {
  const res = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: maxTokens,
    temperature: 0.7,
    messages: [{ role: 'system', content: SYSTEM }, ...messages],
  });
  return res.choices[0].message.content;
}

// ── AI Chat ──
router.post('/chat', auth, async (req, res) => {
  const { message } = req.body;
  if (!message?.trim()) return res.status(400).json({ error: 'Mesaj gerekli' });

  const { rows: history } = await pool.query(
    'SELECT role, content FROM chat_messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 12',
    [req.user.id]
  );

  try {
    const reply = await ask([
      ...history.reverse().map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ], 1500);

    await pool.query(
      'INSERT INTO chat_messages (user_id, role, content) VALUES ($1,$2,$3),($1,$4,$5)',
      [req.user.id, 'user', message, 'assistant', reply]
    );
    await pool.query('UPDATE users SET xp=xp+2 WHERE id=$1', [req.user.id]);
    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: 'AI yanıt veremedi: ' + e.message });
  }
});

// ── Soru Üret (PDF metni VEYA konu adı) ──
router.post('/generate-questions', auth, async (req, res) => {
  const { pdfId, topic, text, count = 10, difficulty = 'medium' } = req.body;

  let sourceText = '';
  let sourceName = '';

  if (pdfId) {
    const { rows } = await pool.query(
      'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
      [pdfId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });
    sourceText = rows[0].extracted_text || '';
    sourceName = rows[0].title;
  } else if (text?.trim()) {
    sourceText = text.trim().slice(0, 8000);
    sourceName = 'Yapıştırılan Metin';
  } else if (topic?.trim()) {
    sourceName = topic.trim();
    // Konudan direkt soru üret, kaynak metin yok
  } else {
    return res.status(400).json({ error: 'PDF, metin veya konu gerekli' });
  }

  const diffMap = { easy: 'kolay (temel bilgi)', medium: 'orta (kavrama ve uygulama)', hard: 'zor (analiz ve değerlendirme)' };

  const contextPart = sourceText
    ? `Aşağıdaki kaynak metni kullan:\n\n${sourceText.slice(0, 7000)}`
    : `Konu: ${sourceName}\nKPSS müfredatındaki bu konudan gerçekçi sorular üret.`;

  const prompt = `${contextPart}

Görev: ${count} adet KPSS tarzı çoktan seçmeli soru üret.
Zorluk: ${diffMap[difficulty] || diffMap.medium}
Konu/Kaynak: ${sourceName}

KRİTER:
- Her soru gerçek KPSS sınavındaki gibi olsun
- Şıklar birbirine yakın ve kafa karıştırıcı olsun (biri bariz doğru olmasın)
- Açıklama öğretici ve net olsun
- Sorular farklı alt konuları kapsasın
- Türkçe dil bilgisi mükemmel olsun

SADECE bu JSON formatında döndür, başka hiçbir şey yazma:
{
  "questions": [
    {
      "text": "Soru metni burada?",
      "options": ["A) Seçenek bir", "B) Seçenek iki", "C) Seçenek üç", "D) Seçenek dört", "E) Seçenek beş"],
      "correct_answer": "B",
      "explanation": "Doğru cevap B çünkü... Diğer seçenekler yanlış çünkü..."
    }
  ]
}`;

  try {
    const reply = await ask([{ role: 'user', content: prompt }], 4000);

    // JSON'u sağlam şekilde çıkar
    let parsed;
    try {
      let jsonText = reply.trim();
      // Markdown kod bloğu temizle
      jsonText = jsonText.replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      // İlk { ile son } arasını al
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('JSON bulunamadı');
      jsonText = jsonText.slice(start, end + 1);
      // Yaygın hataları düzelt: trailing virgül
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      parsed = JSON.parse(jsonText);
    } catch (parseErr) {
      // İkinci deneme: questions array'ini tek tek çıkar
      const objects = reply.match(/\{[^{}]*"text"[^{}]*"correct_answer"[^{}]*\}/g);
      if (objects && objects.length) {
        parsed = { questions: objects.map(o => {
          try { return JSON.parse(o.replace(/,(\s*})/g, '$1')); } catch { return null; }
        }).filter(Boolean) };
      } else {
        throw new Error('AI geçerli soru üretemedi, tekrar dene');
      }
    }

    if (!parsed.questions || !parsed.questions.length) {
      throw new Error('Soru üretilemedi, tekrar dene');
    }

    const saved = [];
    for (const q of parsed.questions) {
      if (!q.text || !q.options || !q.correct_answer) continue;
      const { rows } = await pool.query(
        `INSERT INTO questions (pdf_id, text, options, correct_answer, explanation, difficulty)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [pdfId || null, q.text, JSON.stringify(q.options), q.correct_answer, q.explanation || '', difficulty]
      );
      saved.push(rows[0]);
    }

    if (!saved.length) throw new Error('Geçerli soru oluşturulamadı, tekrar dene');

    await pool.query('UPDATE users SET xp=xp+20 WHERE id=$1', [req.user.id]);
    res.json({ questions: saved, count: saved.length, source: sourceName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Flashcard Üret ──
router.post('/generate-flashcards', auth, async (req, res) => {
  const { pdfId, topic, text, count = 15 } = req.body;

  let sourceText = '';
  let sourceName = '';

  if (pdfId) {
    const { rows } = await pool.query(
      'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
      [pdfId, req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });
    sourceText = rows[0].extracted_text || '';
    sourceName = rows[0].title;
  } else if (text?.trim()) {
    sourceText = text.trim().slice(0, 6000);
    sourceName = 'Yapıştırılan Metin';
  } else if (topic?.trim()) {
    sourceName = topic.trim();
  } else {
    return res.status(400).json({ error: 'PDF, metin veya konu gerekli' });
  }

  const contextPart = sourceText
    ? `Kaynak:\n${sourceText.slice(0, 5000)}`
    : `Konu: ${sourceName} (KPSS müfredatı)`;

  const prompt = `${contextPart}

${count} adet KPSS flashcard üret. Ön yüz kısa soru/kavram, arka yüz açık ve öğretici cevap olsun.

SADECE JSON döndür:
{
  "flashcards": [
    { "front": "Kısa soru veya kavram", "back": "Net ve öğretici cevap" }
  ]
}`;

  try {
    const reply = await ask([{ role: 'user', content: prompt }], 3000);
    const match = reply.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match[0]);

    const saved = [];
    for (const fc of parsed.flashcards || []) {
      const { rows } = await pool.query(
        'INSERT INTO flashcards (user_id, pdf_id, front, back) VALUES ($1,$2,$3,$4) RETURNING *',
        [req.user.id, pdfId || null, fc.front, fc.back]
      );
      saved.push(rows[0]);
    }

    await pool.query('UPDATE users SET xp=xp+10 WHERE id=$1', [req.user.id]);
    res.json({ flashcards: saved, count: saved.length });
  } catch (e) {
    res.status(500).json({ error: 'Flashcard üretilemedi: ' + e.message });
  }
});

// ── PDF Özeti ──
router.post('/summarize/:pdfId', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
    [req.params.pdfId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });

  try {
    const summary = await ask([{
      role: 'user',
      content: `Bu KPSS ders notunun ana konularını ve önemli bilgilerini 4-5 cümleyle özetle. Türkçe yaz:\n\n${rows[0].extracted_text?.slice(0, 4000)}`
    }], 600);

    await pool.query('UPDATE pdfs SET ai_summary=$1 WHERE id=$2', [summary, req.params.pdfId]);
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Chat Geçmişi ──
router.get('/chat', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT role, content, created_at FROM chat_messages WHERE user_id=$1 ORDER BY created_at ASC LIMIT 60',
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;