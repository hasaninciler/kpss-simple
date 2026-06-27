const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// ── Belirli günün planını getir ──
router.get('/', auth, async (req, res) => {
  const date = req.query.date || new Date().toISOString().split('T')[0];
  const { rows } = await pool.query(
    'SELECT * FROM planner WHERE user_id=$1 AND plan_date=$2 ORDER BY sort_order ASC, created_at ASC',
    [req.user.id, date]
  );
  res.json(rows);
});

// ── Görev ekle ──
router.post('/', auth, async (req, res) => {
  const { title, subject, time_start, time_end, duration_min, type, priority, plan_date } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Başlık gerekli' });

  const { rows: [maxRow] } = await pool.query(
    'SELECT COALESCE(MAX(sort_order),0) as max FROM planner WHERE user_id=$1 AND plan_date=$2',
    [req.user.id, plan_date || new Date().toISOString().split('T')[0]]
  );

  const { rows } = await pool.query(
    `INSERT INTO planner (user_id, plan_date, title, subject, time_start, time_end, duration_min, type, priority, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [req.user.id, plan_date || new Date().toISOString().split('T')[0], title.trim(), subject || null,
     time_start || null, time_end || null, duration_min || 30, type || 'study', priority || 'normal', maxRow.max + 1]
  );
  res.json(rows[0]);
});

// ── Görev güncelle (done toggle, edit) ──
router.patch('/:id', auth, async (req, res) => {
  const { done, title, time_start, time_end, priority, subject } = req.body;
  const { rows } = await pool.query(
    `UPDATE planner SET
       done = COALESCE($1, done),
       title = COALESCE($2, title),
       time_start = COALESCE($3, time_start),
       time_end = COALESCE($4, time_end),
       priority = COALESCE($5, priority),
       subject = COALESCE($6, subject)
     WHERE id=$7 AND user_id=$8 RETURNING *`,
    [done, title, time_start, time_end, priority, subject, req.params.id, req.user.id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Bulunamadı' });

  // Görev tamamlandıysa XP ver
  if (done === true) {
    await pool.query('UPDATE users SET xp=xp+5 WHERE id=$1', [req.user.id]);
  }
  res.json(rows[0]);
});

// ── Görev sil ──
router.delete('/:id', auth, async (req, res) => {
  await pool.query('DELETE FROM planner WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  res.json({ ok: true });
});

// ── AI ile otomatik plan oluştur ──
const OpenAI = require('openai');
const deepseek = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com' });

router.post('/ai-generate', auth, async (req, res) => {
  const { hours, weakSubjects, plan_date } = req.body;
  const date = plan_date || new Date().toISOString().split('T')[0];

  try {
    const resp = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      max_tokens: 1500,
      messages: [{
        role: 'user',
        content: `KPSS öğrencisi için günlük çalışma planı oluştur.
Toplam süre: ${hours || 5} saat
${weakSubjects ? `Zayıf konular (öncelik ver): ${weakSubjects}` : ''}

5 dersi dengeli dağıt: Coğrafya, Tarih, Matematik, Türkçe, Vatandaşlık.
Molalar ekle. Sabah 09:00'dan başla.

SADECE JSON döndür:
{
  "plan": [
    { "title": "Coğrafya - İklim konusu çalış", "subject": "Coğrafya", "time_start": "09:00", "time_end": "10:30", "duration_min": 90, "type": "study", "priority": "high" },
    { "title": "Mola", "type": "break", "time_start": "10:30", "time_end": "10:45", "duration_min": 15 }
  ]
}`
      }],
    });

    const text = resp.choices[0].message.content;

    // Sağlam JSON parse
    let parsed;
    try {
      let jsonText = text.trim().replace(/```json\s*/gi, '').replace(/```\s*/g, '');
      const start = jsonText.indexOf('{');
      const end = jsonText.lastIndexOf('}');
      jsonText = jsonText.slice(start, end + 1).replace(/,(\s*[}\]])/g, '$1');
      parsed = JSON.parse(jsonText);
    } catch {
      throw new Error('Plan oluşturulamadı, tekrar dene');
    }

    if (!parsed.plan || !parsed.plan.length) throw new Error('Plan boş geldi, tekrar dene');

    // Önce o günün eski AI planını temizle (opsiyonel - kullanıcı isterse)
    const saved = [];
    let order = 0;
    for (const item of parsed.plan || []) {
      const { rows } = await pool.query(
        `INSERT INTO planner (user_id, plan_date, title, subject, time_start, time_end, duration_min, type, priority, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
        [req.user.id, date, item.title, item.subject || null, item.time_start || null,
         item.time_end || null, item.duration_min || 30, item.type || 'study', item.priority || 'normal', order++]
      );
      saved.push(rows[0]);
    }
    res.json({ plan: saved, count: saved.length });
  } catch (e) {
    res.status(500).json({ error: 'Plan oluşturulamadı: ' + e.message });
  }
});

module.exports = router;
