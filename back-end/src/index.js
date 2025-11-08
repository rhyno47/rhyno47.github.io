require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

const app = express();
// Allow restricting CORS origins via CORS_ORIGIN env (comma-separated list). Defaults to '*'.
const allowedOrigins = (process.env.CORS_ORIGIN || '*')
	.split(',')
	.map(o => o.trim())
	.filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Connect DB
connectDB();

// Routes
app.use('/api/auth', require('./routes/auth'));
// Jobs API (listings)
app.use('/api/jobs', require('./routes/jobs'));
// Posts (announcements) API
app.use('/api/posts', require('./routes/posts'));
// AI chat proxy
app.use('/api/ai', require('./routes/ai'));

// Health
app.get('/', (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
