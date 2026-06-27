const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const pool = require('../db');
const auth = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads', String(req.user.id));
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Sadece PDF kabul edilir'));
  },
});

// Upload
router.post('/', auth, upload.single('file'), async (req, res) => {
  try {
    const buffer = fs.readFileSync(req.file.path);
    const parsed = await pdfParse(buffer);
    const text = parsed.text.slice(0, 50000);

    const { rows } = await pool.query(
      `INSERT INTO pdfs (user_id, title, filename, extracted_text, status)
       VALUES ($1, $2, $3, $4, 'ready') RETURNING *`,
      [req.user.id, req.file.originalname.replace('.pdf', ''), req.file.filename, text]
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// List
router.get('/', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, title, filename, ai_summary, status, created_at,
     (SELECT count(*) FROM questions WHERE pdf_id=pdfs.id) as question_count,
     (SELECT count(*) FROM flashcards WHERE pdf_id=pdfs.id) as flashcard_count
     FROM pdfs WHERE user_id=$1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM pdfs WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  if (!rows.length) return res.status(404).json({ error: 'PDF bulunamadı' });

  const filePath = path.join(__dirname, '../../uploads', String(req.user.id), rows[0].filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await pool.query('DELETE FROM pdfs WHERE id=$1', [req.params.id]);
  res.json({ message: 'Silindi' });
});

module.exports = router;
