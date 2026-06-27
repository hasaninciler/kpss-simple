const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');

// Rozet tanımları
const BADGES = [
  { type: 'first_quiz',   title: 'İlk Adım',       icon: '🎯', desc: 'İlk denemeyi çöz' },
  { type: 'streak_3',     title: 'Isınıyor',       icon: '🔥', desc: '3 günlük seri' },
  { type: 'streak_7',     title: 'Ateşli',         icon: '🔥', desc: '7 günlük seri' },
  { type: 'streak_30',    title: 'Durdurulamaz',   icon: '⚡', desc: '30 günlük seri' },
  { type: 'quiz_10',      title: 'Çözücü',         icon: '✍️', desc: '10 deneme çöz' },
  { type: 'quiz_50',      title: 'Maraton',        icon: '🏃', desc: '50 deneme çöz' },
  { type: 'net_30',       title: 'Keskin Nişancı', icon: '🎖️', desc: '30+ net yap' },
  { type: 'flashcard_50', title: 'Hafıza Ustası',  icon: '🧠', desc: '50 flashcard çalış' },
  { type: 'level_5',      title: 'Yükseliş',       icon: '⭐', desc: 'Seviye 5' },
  { type: 'level_10',     title: 'Şampiyon',       icon: '👑', desc: 'Seviye 10' },
];

// Rozet kontrolü
async function checkBadges(userId) {
  const { rows: [user] } = await pool.query('SELECT xp, streak FROM users WHERE id=$1', [userId]);
  const { rows: [stats] } = await pool.query(
    `SELECT
      (SELECT count(*) FROM quiz_attempts WHERE user_id=$1) as quizzes,
      (SELECT max(net_score) FROM quiz_attempts WHERE user_id=$1) as best_net,
      (SELECT count(*) FROM flashcards WHERE user_id=$1) as flashcards`,
    [userId]
  );

  const level = Math.floor(user.xp / 500) + 1;
  const earned = [];
  const checks = {
    first_quiz:   stats.quizzes >= 1,
    streak_3:     user.streak >= 3,
    streak_7:     user.streak >= 7,
    streak_30:    user.streak >= 30,
    quiz_10:      stats.quizzes >= 10,
    quiz_50:      stats.quizzes >= 50,
    net_30:       (stats.best_net || 0) >= 30,
    flashcard_50: stats.flashcards >= 50,
    level_5:      level >= 5,
    level_10:     level >= 10,
  };

  for (const [type, passed] of Object.entries(checks)) {
    if (passed) {
      const { rowCount } = await pool.query(
        'INSERT INTO achievements (user_id, type) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [userId, type]
      );
      if (rowCount > 0) earned.push(BADGES.find(b => b.type === type));
    }
  }
  return earned;
}

// ── Liderlik tablosu ──
router.get('/leaderboard', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, name, xp, streak,
     (SELECT count(*) FROM quiz_attempts WHERE user_id=users.id) as quizzes
     FROM users WHERE role='student' ORDER BY xp DESC LIMIT 20`
  );
  res.json({ leaderboard: rows, myId: req.user.id });
});

// ── Rozetler ──
router.get('/badges', auth, async (req, res) => {
  await checkBadges(req.user.id);
  const { rows: earned } = await pool.query(
    'SELECT type, earned_at FROM achievements WHERE user_id=$1',
    [req.user.id]
  );
  const earnedTypes = new Set(earned.map(e => e.type));
  const badges = BADGES.map(b => ({
    ...b,
    earned: earnedTypes.has(b.type),
    earnedAt: earned.find(e => e.type === b.type)?.earned_at,
  }));
  res.json({ badges, earnedCount: earned.length, total: BADGES.length });
});

// ── Çalışma süresi kaydet ──
router.post('/study-log', auth, async (req, res) => {
  const { minutes } = req.body;
  await pool.query(
    `INSERT INTO study_log (user_id, minutes, log_date) VALUES ($1, $2, CURRENT_DATE)`,
    [req.user.id, minutes || 0]
  );

  // Streak güncelle
  const { rows: [u] } = await pool.query('SELECT streak, max_streak, last_studied FROM users WHERE id=$1', [req.user.id]);
  let newStreak = u.streak || 0;
  const today = new Date().toISOString().split('T')[0];
  const last = u.last_studied ? new Date(u.last_studied).toISOString().split('T')[0] : null;

  if (last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    newStreak = (last === yesterday) ? newStreak + 1 : 1;
    const maxStreak = Math.max(u.max_streak || 0, newStreak);
    await pool.query('UPDATE users SET streak=$1, max_streak=$2, last_studied=CURRENT_DATE WHERE id=$3',
      [newStreak, maxStreak, req.user.id]);
  }

  res.json({ streak: newStreak });
});

// ── Haftalık çalışma grafiği ──
router.get('/weekly-study', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT log_date, SUM(minutes) as minutes
     FROM study_log
     WHERE user_id=$1 AND log_date >= CURRENT_DATE - INTERVAL '6 days'
     GROUP BY log_date ORDER BY log_date`,
    [req.user.id]
  );

  // 7 günü doldur
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
    const found = rows.find(r => new Date(r.log_date).toISOString().split('T')[0] === d);
    days.push({ date: d, minutes: found ? parseInt(found.minutes) : 0 });
  }
  res.json(days);
});

// ── Konu bazlı performans ──
router.get('/subject-stats', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT subject, SUM(correct) as correct, SUM(wrong) as wrong, SUM(empty) as empty, COUNT(*) as attempts
     FROM quiz_attempts WHERE user_id=$1 AND subject IS NOT NULL
     GROUP BY subject`,
    [req.user.id]
  );
  res.json(rows.map(r => ({
    subject: r.subject,
    correct: parseInt(r.correct),
    wrong: parseInt(r.wrong),
    total: parseInt(r.correct) + parseInt(r.wrong) + parseInt(r.empty),
    rate: parseInt(r.correct) + parseInt(r.wrong) > 0
      ? Math.round((parseInt(r.correct) / (parseInt(r.correct) + parseInt(r.wrong))) * 100)
      : 0,
    attempts: parseInt(r.attempts),
  })));
});

module.exports = router;
