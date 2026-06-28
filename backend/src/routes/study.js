const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// KPSS konu listesi
const TOPICS = {
  'Coğrafya': ['Coğrafi Konum','İklim','Yüzey Şekilleri','Akarsular ve Göller','Nüfus','Yerleşme','Tarım','Hayvancılık','Madenler','Sanayi','Ulaşım','Turizm','Bölgeler'],
  'Tarih': ['İslamiyet Öncesi Türkler','İlk Türk Devletleri','İslam Tarihi','Osmanlı Kuruluş','Osmanlı Yükselme','Osmanlı Duraklama','Osmanlı Gerileme','Dağılma Dönemi','Kurtuluş Savaşı','İnkılaplar','Atatürk İlkeleri'],
  'Matematik': ['Temel Kavramlar','Sayılar','Bölme Bölünebilme','EBOB EKOK','Rasyonel Sayılar','Basit Eşitsizlik','Mutlak Değer','Üslü Sayılar','Köklü Sayılar','Çarpanlara Ayırma','Oran Orantı','Problemler'],
  'Türkçe': ['Sözcükte Anlam','Cümlede Anlam','Paragraf','Ses Bilgisi','Yazım Kuralları','Noktalama','Sözcük Türleri','Cümlenin Ögeleri','Fiiller','Anlatım Bozukluğu'],
  'Vatandaşlık': ['Hukuk Başlangıcı','Anayasa Hukuku','Temel Haklar','Yasama','Yürütme','Yargı','İdare Hukuku','Uluslararası Kuruluşlar'],
};

// ── Konu listesi + ilerleme ──
router.get('/topics', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT subject, topic, status FROM topic_progress WHERE user_id=$1',
    [req.user.id]
  );
  const progressMap = {};
  rows.forEach(r => { progressMap[`${r.subject}_${r.topic}`] = r.status; });

  const result = {};
  for (const [subject, topics] of Object.entries(TOPICS)) {
    result[subject] = topics.map(topic => ({
      topic,
      status: progressMap[`${subject}_${topic}`] || 'not_started',
    }));
  }
  res.json(result);
});

// ── Konu durumu güncelle ──
router.post('/topics', auth, async (req, res) => {
  const { subject, topic, status } = req.body;
  await pool.query(
    `INSERT INTO topic_progress (user_id, subject, topic, status, updated_at)
     VALUES ($1,$2,$3,$4,NOW())
     ON CONFLICT (user_id, subject, topic)
     DO UPDATE SET status=$4, updated_at=NOW()`,
    [req.user.id, subject, topic, status]
  );
  res.json({ ok: true });
});

// ── Yanlışlar defteri: ekle ──
router.post('/wrong', auth, async (req, res) => {
  const { questions } = req.body; // [{ text, options, correct_answer, explanation, user_answer, subject }]
  for (const q of questions) {
    await pool.query(
      `INSERT INTO wrong_answers (user_id, question_text, options, correct_answer, explanation, user_answer, subject)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [req.user.id, q.text, JSON.stringify(q.options), q.correct_answer, q.explanation, q.user_answer, q.subject || null]
    );
  }
  res.json({ ok: true, count: questions.length });
});

// ── Yanlışlar defteri: listele ──
router.get('/wrong', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM wrong_answers WHERE user_id=$1 AND solved=false ORDER BY created_at DESC LIMIT 50',
    [req.user.id]
  );
  res.json(rows);
});

// ── Yanlışı çözüldü işaretle ──
router.post('/wrong/:id/solved', auth, async (req, res) => {
  await pool.query('UPDATE wrong_answers SET solved=true WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ── Günlük görevler ──
router.get('/daily', auth, async (req, res) => {
  const { rows: [task] } = await pool.query(
    `SELECT * FROM daily_tasks WHERE user_id=$1 AND task_date=CURRENT_DATE`,
    [req.user.id]
  );
  const { rows: [user] } = await pool.query('SELECT daily_goal FROM users WHERE id=$1', [req.user.id]);

  res.json({
    goal: user?.daily_goal || 30,
    questionsSolved: task?.questions_solved || 0,
    videosWatched: task?.videos_watched || 0,
    flashcardsDone: task?.flashcards_done || 0,
  });
});

// ── Günlük görev güncelle ──
router.post('/daily/increment', auth, async (req, res) => {
  const { type, amount = 1 } = req.body; // type: questions, videos, flashcards
  const col = { questions: 'questions_solved', videos: 'videos_watched', flashcards: 'flashcards_done' }[type];
  if (!col) return res.status(400).json({ error: 'Geçersiz tip' });

  await pool.query(
    `INSERT INTO daily_tasks (user_id, task_date, ${col})
     VALUES ($1, CURRENT_DATE, $2)
     ON CONFLICT (user_id, task_date)
     DO UPDATE SET ${col} = daily_tasks.${col} + $2`,
    [req.user.id, amount]
  );
  res.json({ ok: true });
});

// ── Hedef güncelle ──
router.post('/goal', auth, async (req, res) => {
  const { dailyGoal, targetDate } = req.body;
  await pool.query(
    'UPDATE users SET daily_goal=COALESCE($1, daily_goal), target_date=COALESCE($2, target_date) WHERE id=$3',
    [dailyGoal, targetDate, req.user.id]
  );
  res.json({ ok: true });
});

// ── Yanlışlardan flashcard üret (AI) ──
router.post('/wrong-to-flashcards', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT question_text, correct_answer, explanation FROM wrong_answers WHERE user_id=$1 AND solved=false LIMIT 20',
    [req.user.id]
  );
  if (!rows.length) return res.json({ count: 0 });

  for (const w of rows) {
    await pool.query(
      'INSERT INTO flashcards (user_id, front, back) VALUES ($1,$2,$3)',
      [req.user.id, w.question_text, `Doğru cevap: ${w.correct_answer}\n\n${w.explanation || ''}`]
    );
  }
  res.json({ count: rows.length });
});

// ── Manuel yanlış soru ekle (fiziksel testten) ──
router.post('/wrong/manual', auth, async (req, res) => {
  const { question_text, options, correct_answer, subject } = req.body;
  if (!question_text?.trim()) return res.status(400).json({ error: 'Soru metni gerekli' });

  const { rows } = await pool.query(
    `INSERT INTO wrong_answers (user_id, question_text, options, correct_answer, explanation, user_answer, subject)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [req.user.id, question_text.trim(), JSON.stringify(options || []), correct_answer || '', '', '', subject || null]
  );
  res.json(rows[0]);
});

// ── AI ile soruyu açıkla ──
const OpenAIExplain = require('openai');
const deepseekExplain = new OpenAIExplain({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });

router.post('/wrong/:id/explain', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM wrong_answers WHERE id=$1 AND user_id=$2',
    [req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Soru bulunamadı' });

  const w = rows[0];
  let opts = [];
  try { opts = typeof w.options === 'string' ? JSON.parse(w.options) : w.options; } catch {}

  const optText = (opts || []).map((o, i) => `${['A','B','C','D','E'][i]}) ${String(o).replace(/^[A-E]\)\s*/, '')}`).join('\n');

  const prompt = `Bir KPSS öğrencisi şu soruyu çözemedi. Sen uzman bir öğretmensin.

SORU: ${w.question_text}

${optText ? `ŞIKLAR:\n${optText}\n` : ''}
${w.correct_answer ? `DOĞRU CEVAP: ${w.correct_answer}` : ''}

Görevin:
1. Soruyu adım adım, anlaşılır şekilde açıkla
2. Doğru cevabın neden doğru olduğunu anlat
3. Varsa diğer şıkların neden yanlış olduğunu söyle
4. Bu konuda akılda kalıcı bir ipucu/püf nokta ver

Türkçe, samimi ve öğretici bir dille açıkla. Çok uzun olmasın, net olsun.`;

  try {
    const resp = await deepseekExplain.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: 'Sen sabırlı, anlaşılır anlatan uzman bir KPSS öğretmenisin. Her zaman Türkçe açıklarsın.' },
        { role: 'user', content: prompt },
      ],
    });
    const explanation = resp.choices[0].message.content;

    // Açıklamayı kaydet
    await pool.query('UPDATE wrong_answers SET explanation=$1 WHERE id=$2', [explanation, w.id]);
    await pool.query('UPDATE users SET xp=xp+3 WHERE id=$1', [req.user.id]);

    res.json({ explanation });
  } catch (e) {
    res.status(500).json({ error: 'AI açıklayamadı: ' + e.message });
  }
});

module.exports = router;
