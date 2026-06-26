const router = require('express').Router();
const Anthropic = require('@anthropic-ai/sdk');
const pool = require('../db');
const auth = require('../middleware/auth');

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Chat ──
router.post('/chat', auth, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: 'Mesaj gerekli' });

  // Son 10 mesajı al
  const { rows: history } = await pool.query(
    'SELECT role, content FROM chat_messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10',
    [req.user.id]
  );

  const messages = [
    ...history.reverse().map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ];

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `Sen KPSS Master AI öğretmenisin. KPSS'ye hazırlanan Türk öğrencilere yardım ediyorsun.
Her zaman Türkçe cevap ver. Kısa ve öz ol. KPSS müfredatına odaklan.`,
    messages,
  });

  const reply = response.content[0].text;

  // Her iki mesajı da kaydet
  await pool.query(
    'INSERT INTO chat_messages (user_id, role, content) VALUES ($1,$2,$3),($1,$4,$5)',
    [req.user.id, 'user', message, 'assistant', reply]
  );

  // XP ekle
  await pool.query('UPDATE users SET xp=xp+2 WHERE id=$1', [req.user.id]);

  res.json({ reply });
});

// ── Soru Üret ──
router.post('/generate-questions', auth, async (req, res) => {
  const { pdfId, count = 10, difficulty = 'medium' } = req.body;

  const { rows } = await pool.query(
    'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
    [pdfId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });

  const { extracted_text, title } = rows[0];

  const prompt = `Aşağıdaki KPSS ders notundan ${count} adet çoktan seçmeli soru üret.
Zorluk: ${difficulty === 'easy' ? 'kolay' : difficulty === 'hard' ? 'zor' : 'orta'}
Kaynak: ${title}

${extracted_text.slice(0, 6000)}

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
}`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  let parsed;
  try {
    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match[0]);
  } catch {
    return res.status(500).json({ error: 'AI yanıtı parse edilemedi' });
  }

  // Soruları kaydet
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
});

// ── Flashcard Üret ──
router.post('/generate-flashcards', auth, async (req, res) => {
  const { pdfId, count = 10 } = req.body;

  const { rows } = await pool.query(
    'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
    [pdfId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });

  const { extracted_text, title } = rows[0];

  const prompt = `Aşağıdaki KPSS ders notundan ${count} adet flashcard üret.

${extracted_text.slice(0, 4000)}

SADECE JSON döndür:
{
  "flashcards": [
    { "front": "Soru veya kavram", "back": "Cevap veya açıklama" }
  ]
}`;

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  let parsed;
  try {
    const text = response.content[0].text;
    const match = text.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match[0]);
  } catch {
    return res.status(500).json({ error: 'AI yanıtı parse edilemedi' });
  }

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
});

// ── PDF Özeti ──
router.post('/summarize/:pdfId', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT extracted_text, title FROM pdfs WHERE id=$1 AND user_id=$2',
    [req.params.pdfId, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Bu KPSS ders notunu 3-4 cümleyle özetle:\n\n${rows[0].extracted_text.slice(0, 3000)}`
    }],
  });

  const summary = response.content[0].text;
  await pool.query('UPDATE pdfs SET ai_summary=$1 WHERE id=$2', [summary, req.params.pdfId]);
  res.json({ summary });
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
