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
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pdfs (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      filename TEXT NOT NULL,
      extracted_text TEXT,
      ai_summary TEXT,
      status TEXT DEFAULT 'ready',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS questions (
      id SERIAL PRIMARY KEY,
      pdf_id INT REFERENCES pdfs(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      options JSONB NOT NULL,
      correct_answer TEXT NOT NULL,
      explanation TEXT,
      difficulty TEXT DEFAULT 'medium',
      subject TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS quiz_attempts (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT,
      correct INT DEFAULT 0,
      wrong INT DEFAULT 0,
      empty INT DEFAULT 0,
      net_score FLOAT,
      answers JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      pdf_id INT REFERENCES pdfs(id) ON DELETE SET NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      interval_days INT DEFAULT 1,
      ease_factor FLOAT DEFAULT 2.5,
      due_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      earned_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, type)
    );

    CREATE TABLE IF NOT EXISTS study_log (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      minutes INT DEFAULT 0,
      log_date DATE DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS max_streak INT DEFAULT 0;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS target_date DATE;
    ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS subject TEXT;
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS subject TEXT;
  `);

  console.log('✅ Tablolar oluşturuldu');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
