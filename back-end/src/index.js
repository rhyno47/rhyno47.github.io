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

// Static assets (optional landing page)
const staticDir = path.join(__dirname, '..', 'public');
app.use(express.static(staticDir));

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

// Root: redirect to frontend if configured, else serve landing page (if present), else health JSON
app.get('/', (req, res) => {
	const to = process.env.FRONTEND_URL;
	if (to) return res.redirect(302, to);
	try {
		return res.sendFile(path.join(staticDir, 'index.html'));
	} catch (e) {
		return res.json({ ok: true });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
