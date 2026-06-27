const pool = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  const password = await bcrypt.hash('Demo2026!', 10);

  await pool.query(`
    INSERT INTO users (name, email, password, role)
    VALUES
      ('Admin', 'admin@kpss.com', $1, 'admin'),
      ('Demo Öğrenci', 'demo@kpss.com', $1, 'student')
    ON CONFLICT (email) DO NOTHING;
  `, [password]);

  console.log('✅ Demo kullanıcılar eklendi');
  console.log('   admin@kpss.com / Demo2026!');
  console.log('   demo@kpss.com  / Demo2026!');
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
