require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

const app = express();
// Robust CORS: if CORS_ORIGIN is unset or '*', reflect the request origin (so credentials are valid).
// Otherwise, only allow the listed origins (comma-separated).
const rawCors = process.env.CORS_ORIGIN || '';
const whitelist = rawCors.split(',').map(o => o.trim()).filter(Boolean);
const corsOptions = {
	origin(origin, cb) {
		// allow server-to-server or same-origin requests without an Origin header
		if (!origin) return cb(null, true);
		// If no whitelist provided or it includes '*', reflect the origin (works with credentials)
		if (whitelist.length === 0 || whitelist.includes('*') || whitelist.includes(origin)) {
			return cb(null, true);
		}
		return cb(new Error('CORS: Origin not allowed: ' + origin));
	},
	credentials: true,
	methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
	// Do not hardcode allowedHeaders; let the CORS middleware reflect
	// the Access-Control-Request-Headers from the browser automatically.
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
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

// Diagnostic: ephemeral egress IP checker (temporary; remove in production)
// Returns the server's current outbound IP as seen by ifconfig.co.
// Helps with external service allowlisting.
app.get('/whoami', async (req, res) => {
	try {
		const fetch = require('node-fetch');
		const r = await fetch('https://ifconfig.co/json', { timeout: 8000 }).catch(e => { throw e; });
		if(!r.ok) throw new Error('Upstream status ' + r.status);
		const json = await r.json();
		console.log('[whoami] outbound ip:', json.ip);
		res.json({ ip: json.ip, raw: json });
	} catch (e) {
		console.error('[whoami] error', e.message || e);
		res.status(500).json({ error: 'whoami failed', message: e.message || String(e) });
	}
});

// Root: redirect to frontend if configured, else serve landing page (if present), else health JSON
app.get('/', (req, res) => {
	// Default redirect to GitHub Pages if FRONTEND_URL not provided
	const to = process.env.FRONTEND_URL || 'https://rhyno47.github.io';
	if (to) return res.redirect(302, to);
	try {
		return res.sendFile(path.join(staticDir, 'index.html'));
	} catch (e) {
		return res.json({ ok: true });
	}
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
