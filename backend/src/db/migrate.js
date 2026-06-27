const pool = require('../db');

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'student',
      xp INT DEFAULT 0,
      streak INT DEFAULT 0,
      max_streak INT DEFAULT 0,
      last_studied DATE,
      target_date DATE,
      daily_goal INT DEFAULT 30,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pdfs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL, filename TEXT NOT NULL,
      extracted_text TEXT, ai_summary TEXT,
      status TEXT DEFAULT 'ready',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      pdf_id INT REFERENCES pdfs(id) ON DELETE CASCADE,
      text TEXT NOT NULL, options JSONB NOT NULL,
      correct_answer TEXT NOT NULL, explanation TEXT,
      difficulty TEXT DEFAULT 'medium', subject TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT, mode TEXT DEFAULT 'practice',
      correct INT DEFAULT 0, wrong INT DEFAULT 0, empty INT DEFAULT 0,
      net_score FLOAT, duration_seconds INT,
      answers JSONB, created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      pdf_id INT REFERENCES pdfs(id) ON DELETE SET NULL,
      front TEXT NOT NULL, back TEXT NOT NULL,
      interval_days INT DEFAULT 1, ease_factor FLOAT DEFAULT 2.5,
      due_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL, content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL, earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, type)
    );

    CREATE TABLE IF NOT EXISTS study_log (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      minutes INT DEFAULT 0, log_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- YANLIŞLAR DEFTERİ
    CREATE TABLE IF NOT EXISTS wrong_answers (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      user_answer TEXT,
      subject TEXT,
      solved BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- KONU TAKİP
    CREATE TABLE IF NOT EXISTS topic_progress (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      topic TEXT NOT NULL,
      status TEXT DEFAULT 'not_started',
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, subject, topic)
    );

    -- GÜNLÜK GÖREVLER
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      task_date DATE DEFAULT CURRENT_DATE,
      questions_solved INT DEFAULT 0,
      videos_watched INT DEFAULT 0,
      flashcards_done INT DEFAULT 0,
      UNIQUE(user_id, task_date)
    );

    -- GÜNLÜK PLAN / YAPILACAKLAR
    CREATE TABLE IF NOT EXISTS planner (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      plan_date DATE DEFAULT CURRENT_DATE,
      title TEXT NOT NULL,
      subject TEXT,
      time_start TEXT,
      time_end TEXT,
      duration_min INT DEFAULT 30,
      type TEXT DEFAULT 'study',
      priority TEXT DEFAULT 'normal',
      done BOOLEAN DEFAULT false,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS max_streak INT DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS target_date DATE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal INT DEFAULT 30;
    ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS subject TEXT;
    ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'practice';
    ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS duration_seconds INT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject TEXT;
  `);

  console.log('✅ Tüm tablolar hazır');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
