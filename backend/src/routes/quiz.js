const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// ── Soruları getir ──
router.get('/questions', auth, async (req, res) => {
  const { pdfId, limit = 20 } = req.query;
  const where = pdfId ? 'WHERE q.pdf_id=$1' : 'WHERE p.user_id=$1';
  const param = pdfId || req.user.id;

  const { rows } = await pool.query(
    `SELECT q.* FROM questions q
     JOIN pdfs p ON q.pdf_id=p.id
     ${where} ORDER BY RANDOM() LIMIT $2`,
    [param, limit]
  );
  res.json(rows);
});

// ── Quiz gönder ──
router.post('/quiz/submit', auth, async (req, res) => {
  const { answers } = req.body;
  // answers: [{ questionId, selected }]

  const ids = answers.map(a => a.questionId);
  const { rows: questions } = await pool.query(
    'SELECT id, correct_answer FROM questions WHERE id=ANY($1)',
    [ids]
  );

  const correctMap = Object.fromEntries(questions.map(q => [q.id, q.correct_answer]));
  let correct = 0, wrong = 0, empty = 0;

  for (const a of answers) {
    if (!a.selected) empty++;
    else if (a.selected === correctMap[a.questionId]) correct++;
    else wrong++;
  }

  const netScore = Math.round((correct - wrong * 0.25) * 10) / 10;
  const xpEarned = Math.max(0, correct * 10 - wrong * 3);

  await pool.query(
    'INSERT INTO quiz_attempts (user_id, correct, wrong, empty, net_score, answers) VALUES ($1,$2,$3,$4,$5,$6)',
    [req.user.id, correct, wrong, empty, netScore, JSON.stringify(answers)]
  );

  await pool.query('UPDATE users SET xp=xp+$1 WHERE id=$2', [xpEarned, req.user.id]);

  res.json({ correct, wrong, empty, netScore, xpEarned, total: answers.length });
});

// ── Flashcard listesi ──
router.get('/flashcards', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM flashcards WHERE user_id=$1 ORDER BY due_date ASC',
    [req.user.id]
  );
  res.json(rows);
});

// ── Bugün bekleyen flashcard'lar ──
router.get('/flashcards/due', auth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM flashcards WHERE user_id=$1 AND due_date<=CURRENT_DATE ORDER BY due_date ASC LIMIT 20",
    [req.user.id]
  );
  res.json(rows);
});

// ── Flashcard değerlendir (SM-2) ──
router.post('/flashcards/:id/review', auth, async (req, res) => {
  const { quality } = req.body; // 0=again 1=hard 3=good 5=easy
  const { rows } = await pool.query(
    'SELECT * FROM flashcards WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Kart bulunamadı' });

  const card = rows[0];
  let ease = card.ease_factor;
  let interval = card.interval_days;

  ease = Math.max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (quality < 3) interval = 1;
  else if (interval === 1) interval = 6;
  else interval = Math.round(interval * ease);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + interval);

  await pool.query(
    'UPDATE flashcards SET interval_days=$1, ease_factor=$2, due_date=$3 WHERE id=$4',
    [interval, ease, dueDate.toISOString().split('T')[0], req.params.id]
  );

  await pool.query('UPDATE users SET xp=xp+3 WHERE id=$1', [req.user.id]);
  res.json({ interval, nextReview: dueDate });
});

// ── Dashboard istatistikleri ──
router.get('/stats', auth, async (req, res) => {
  const uid = req.user.id;
  const [userRes, attemptsRes, pdfsRes, fcRes] = await Promise.all([
    pool.query('SELECT xp, streak, name FROM users WHERE id=$1', [uid]),
    pool.query('SELECT correct, wrong, net_score, created_at FROM quiz_attempts WHERE user_id=$1 ORDER BY created_at DESC LIMIT 20', [uid]),
    pool.query('SELECT count(*) FROM pdfs WHERE user_id=$1', [uid]),
    pool.query('SELECT count(*) FROM flashcards WHERE user_id=$1', [uid]),
  ]);

  const attempts = attemptsRes.rows;
  const totalCorrect = attempts.reduce((s, a) => s + a.correct, 0);
  const totalWrong = attempts.reduce((s, a) => s + a.wrong, 0);
  const avgNet = attempts.length
    ? Math.round(attempts.reduce((s, a) => s + (a.net_score || 0), 0) / attempts.length * 10) / 10
    : 0;

  res.json({
    user: userRes.rows[0],
    totalAttempts: attempts.length,
    totalCorrect,
    totalWrong,
    avgNet,
    totalPdfs: parseInt(pdfsRes.rows[0].count),
    totalFlashcards: parseInt(fcRes.rows[0].count),
    recentAttempts: attempts.slice(0, 7),
  });
});

module.exports = router;
