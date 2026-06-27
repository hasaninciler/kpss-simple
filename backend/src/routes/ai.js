const router = require('express').Router();
const OpenAI = require('openai');
const pool = require('../db');
const auth = require('../middleware/auth');

// DeepSeek, OpenAI-compatible API kullanıyor
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

async function ask(messages, system) {
  const res = await deepseek.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    messages: [
      { role: 'system', content: system || 'Sen KPSS uzmanı bir öğretmenisin. Her zaman Türkçe cevap ver.' },
      ...messages,
    ],
  });
  return res.choices[0].message.content;
}

// ── Chat ──
router.post('/chat', auth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mesaj gerekli' });

  const { rows: history } = await pool.query(
    'SELECT role, content FROM chat_messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10',
    [req.user.id]
  );

  try {
    const reply = await ask(
      [...history.reverse(), { role: 'user', content: message }],
      'Sen KPSS Master AI öğretmenisin. KPSS\'ye hazırlanan Türk öğrencilere yardım ediyorsun. Her zaman Türkçe, kısa ve öz cevap ver. KPSS müfredatına odaklan.'
    );

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

// ── Soru Üret ──
router.post('/generate-questions', auth, async (req, res) => {
  const { pdfId, count = 10, difficulty = 'medium' } = req.body;

  const { rows } = await pool.query(
    'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
    [pdfId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });

  const diffMap = { easy: 'kolay', medium: 'orta', hard: 'zor' };

  try {
    const reply = await ask([{
      role: 'user',
      content: `Aşağıdaki KPSS ders notundan ${count} adet çoktan seçmeli soru üret.
Zorluk: ${diffMap[difficulty] || 'orta'}
Kaynak: ${rows[0].title}

${rows[0].extracted_text.slice(0, 6000)}

SADECE JSON döndür, başka hiçbir şey yazma:
{
  "questions": [
    {
      "text": "Soru metni?",
      "options": ["A) ...", "B) ...", "C) ...", "D) ...", "E) ..."],
      "correct_answer": "A",
      "explanation": "Açıklama"
    }
  ]
}`
    }]);

    const match = reply.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match[0]);

    const saved = [];
    for (const q of parsed.questions) {
      const { rows: qRows } = await pool.query(
        `INSERT INTO questions (pdf_id, text, options, correct_answer, explanation, difficulty)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [pdfId, q.text, JSON.stringify(q.options), q.correct_answer, q.explanation, difficulty]
      );
      saved.push(qRows[0]);
    }

    await pool.query('UPDATE users SET xp=xp+20 WHERE id=$1', [req.user.id]);
    res.json({ questions: saved, count: saved.length });
  } catch (e) {
    res.status(500).json({ error: 'Soru üretilemedi: ' + e.message });
  }
});

// ── Flashcard Üret ──
router.post('/generate-flashcards', auth, async (req, res) => {
  const { pdfId, count = 10 } = req.body;

  const { rows } = await pool.query(
    'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
    [pdfId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });

  try {
    const reply = await ask([{
      role: 'user',
      content: `Aşağıdaki KPSS ders notundan ${count} adet flashcard üret.

${rows[0].extracted_text.slice(0, 4000)}

SADECE JSON döndür:
{
  "flashcards": [
    { "front": "Soru veya kavram", "back": "Cevap veya açıklama" }
  ]
}`
    }]);

    const match = reply.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match[0]);

    const saved = [];
    for (const fc of parsed.flashcards) {
      const { rows: fcRows } = await pool.query(
        'INSERT INTO flashcards (user_id, pdf_id, front, back) VALUES ($1,$2,$3,$4) RETURNING *',
        [req.user.id, pdfId, fc.front, fc.back]
      );
      saved.push(fcRows[0]);
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
      content: `Bu KPSS ders notunu 3-4 cümleyle Türkçe özetle:\n\n${rows[0].extracted_text.slice(0, 3000)}`
    }]);

    await pool.query('UPDATE pdfs SET ai_summary=$1 WHERE id=$2', [summary, req.params.pdfId]);
    res.json({ summary });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Chat Geçmişi ──
router.get('/chat', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT role, content, created_at FROM chat_messages WHERE user_id=$1 ORDER BY created_at ASC LIMIT 50',
    [req.user.id]
  );
  res.json(rows);
});

module.exports = router;
