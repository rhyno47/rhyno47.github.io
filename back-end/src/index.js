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
// Always allow common local dev origins to simplify testing even when CORS_ORIGIN is set
const devOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/i;
function computeCors(origin){
	// When there is no Origin header (same-origin navigation, server-to-server, curl),
	// do not set any CORS headers.
	if(!origin) return null;
	if(devOriginRegex.test(origin)) return { origin, credentials:true };
	if(whitelist.length === 0 || whitelist.includes('*') || whitelist.includes(origin)) return { origin, credentials:true };
	return false; // blocked
}
app.use((req,res,next)=>{
	const origin = req.headers.origin;
	const opts = computeCors(origin);
	// Blocked origin: log and continue without CORS headers
	if(opts === false){ console.warn('[CORS] Blocked origin', origin); return next(); }
	// No origin header: skip CORS headers entirely
	if(opts === null){ return next(); }
	// Allowed: set headers
	res.setHeader('Access-Control-Allow-Origin', opts.origin);
	res.setHeader('Vary', 'Origin');
	if(opts.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
	const reqHeaders = req.headers['access-control-request-headers'];
	if(req.method === 'OPTIONS'){
		if(reqHeaders) res.setHeader('Access-Control-Allow-Headers', reqHeaders);
		return res.status(204).end();
	}
	next();
});
app.use(express.json());

// Explicit error handler for CORS rejections so browser gets a 403 with CORS headers
app.use(function corsErrorHandler(err, req, res, next){
	if(err && /CORS: Origin not allowed/.test(err.message)){
		// Return a controlled 403; do NOT expose internal details
		// Reflect origin ONLY if dev to ease debugging; otherwise omit
		const origin = req.headers.origin;
		const devOriginRegex = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/i;
		if(origin && devOriginRegex.test(origin)){
			res.setHeader('Access-Control-Allow-Origin', origin);
			res.setHeader('Vary', 'Origin');
		}
		return res.status(403).json({ message: 'CORS blocked', origin });
	}
	next(err);
});

// Static assets (optional landing page)
const staticDir = path.join(__dirname, '..', 'public');
app.use(express.static(staticDir));

// Serve uploaded files
const uploadsPath = path.join(__dirname, '..', 'uploads');
try{ require('fs').mkdirSync(uploadsPath, { recursive: true }); }catch(e){ console.error('[index] ensure uploads dir failed', e); }
app.use('/uploads', express.static(uploadsPath, {
	fallthrough: true,
	setHeaders(res){
		// Allow images to be embedded across origins
		res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
	}
}));

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
