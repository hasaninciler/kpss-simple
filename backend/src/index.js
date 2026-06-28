require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/pdfs',    require('./routes/pdfs'));
app.use('/api/ai',      require('./routes/ai'));
app.use('/api/youtube', require('./routes/youtube'));
app.use('/api/social',  require('./routes/social'));
app.use('/api/study',   require('./routes/study'));
app.use('/api/planner', require('./routes/planner'));
app.use('/api',         require('./routes/quiz'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Backend: http://localhost:${PORT}`));
