require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const path = require('path');

const app = express();
// Robust CORS handling with sane defaults and origin normalization
// - If CORS_ORIGIN is unset: allow known frontend (FRONTEND_URL or GitHub Pages) and dev origins
// - If CORS_ORIGIN is set: allow any of the comma-separated origins (trailing slashes tolerated)
// - Always reflect the exact request Origin value when allowing (to support credentials)
const rawCors = process.env.CORS_ORIGIN || '';
const frontendUrl = (process.env.FRONTEND_URL || 'https://rhyno47.github.io').trim();

function norm(o){
	if(!o) return '';
	try{
		// Ensure scheme+host(+port) only, drop trailing slash and paths
		const u = new URL(o.includes('://') ? o : ('https://' + o));
		const host = u.host.toLowerCase();
		const proto = (u.protocol || 'https:').toLowerCase();
		return proto + '//' + host;
	}catch(e){
		// Fallback to simple trim of trailing slash
		return String(o).trim().replace(/\/$/, '').toLowerCase();
	}
}

let whitelist = rawCors.split(',').map(o => o.trim()).filter(Boolean);
// If not provided, seed with FRONTEND_URL and our GitHub Pages default
if(whitelist.length === 0){
	whitelist = [frontendUrl, 'https://rhyno47.github.io'];
}
const normalizedWhitelist = new Set(whitelist.map(norm));

// Always allow common local dev origins to simplify testing even when CORS_ORIGIN is set
const devOriginRegex = /^https?:\/\/(localhost(?::\d+)?|127\.0\.0\.1(?::\d+)?|192\.168\.[0-9.]+(?::\d+)?|10\.[0-9.]+(?::\d+)?)/i;

function computeCors(origin){
	// When there is no Origin header (same-origin navigation, server-to-server, curl), skip CORS headers.
	if(!origin) return null;
	// Always allow local dev
	if(devOriginRegex.test(origin)) return { origin, credentials: true };
	const n = norm(origin);
	if(normalizedWhitelist.has(n) || normalizedWhitelist.has('*')) return { origin, credentials: true };
	return false; // blocked
}
// Track last blocked origin for diagnostics (not persisted)
let lastBlockedOrigin = null;

app.use((req,res,next)=>{
	const origin = req.headers.origin;
	const opts = computeCors(origin);
	// Blocked origin: log and continue without CORS headers
	if(opts === false){ console.warn('[CORS] Blocked origin', origin); return next(); }
	// No origin header: skip CORS headers entirely
	if(opts === null){ return next(); }
	// Allowed: set headers
		// Diagnostics: log allowed origin per-request (keeps console noise small)
		if (origin) console.log('[CORS] Allowing origin', origin);
		res.setHeader('Access-Control-Allow-Origin', opts.origin);
	res.setHeader('Vary', 'Origin');
	if(opts.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
	const reqHeaders = req.headers['access-control-request-headers'];
	if(req.method === 'OPTIONS'){
		if(reqHeaders) res.setHeader('Access-Control-Allow-Headers', reqHeaders);
		// Cache preflight to reduce subsequent OPTIONS calls
		res.setHeader('Access-Control-Max-Age', '600');
		return res.status(204).end();
	}
	next();
});
// Wrap the middleware to set lastBlockedOrigin when blocked
// (We add this afterwards so the variable is in scope above as well.)

// Recreate the middleware pattern with explicit blocked logging
app._router.stack = app._router.stack; // no-op to satisfy some linters

// Update blocked origin behavior: set lastBlockedOrigin when blocked
// We adjust by adding a small middleware earlier in chain to capture blocked origins
app.use((req, res, next) => {
	const origin = req.headers.origin;
	const opts = computeCors(origin);
	if (opts === false) {
		lastBlockedOrigin = origin || '<no-origin-header>';
		console.warn('[CORS] Blocking origin (recorded):', lastBlockedOrigin);
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

// Debug diagnostics endpoint (only enabled when DEBUG_DIAG=true)
// Returns runtime CORS info useful for remote troubleshooting.
if (/^true$/i.test(process.env.DEBUG_DIAG || '')){
	app.get('/diag', (req, res) => {
		return res.json({
			ok: true,
			frontendUrl,
			rawCors: rawCors || null,
			normalizedWhitelist: Array.from(normalizedWhitelist || []),
			lastBlockedOrigin: lastBlockedOrigin || null,
			requestOrigin: req.headers.origin || null,
			timestamp: new Date().toISOString()
		});
	});
	console.log('[startup] DEBUG_DIAG enabled: /diag available');
}

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

// Placeholder redirect for missing uploaded images (after express.static fallthrough)
// If a requested /uploads/* file doesn't exist (Render ephemeral disk or old reference),
// we redirect to a configurable placeholder so the frontend shows an image instead of a broken icon.
// Customize with UPLOADS_PLACEHOLDER_URL env var; defaults to a generic placeholder service.
app.use('/uploads', (req, res, next) => {
	if (req.method !== 'GET' && req.method !== 'HEAD') return next();
	// If we reached here, express.static did not find the file.
	const requested = req.path.replace(/^\/+/, '');
	console.warn('[uploads] missing file, serving placeholder:', requested);
	const placeholder = process.env.UPLOADS_PLACEHOLDER_URL || 'https://via.placeholder.com/480x320?text=Image+Missing';
	// Provide lightweight caching; missing files might appear later after new deployments.
	res.setHeader('Cache-Control', 'public, max-age=60');
	return res.redirect(302, placeholder);
});

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
	// If INTERNAL_FRONTEND=true serve the synced static site directly.
	// Otherwise, if FRONTEND_URL is set, redirect to that canonical front-end.
	// Fallback: serve local index.html (API landing or synced site) else JSON health.
	const internal = /^true$/i.test(process.env.INTERNAL_FRONTEND || '');
	if(!internal){
		const to = process.env.FRONTEND_URL || 'https://rhyno47.github.io';
		if (to) return res.redirect(302, to);
	}
	try {
		return res.sendFile(path.join(staticDir, 'index.html'));
	} catch (e) {
		return res.json({ ok: true });
	}
});

const PORT = process.env.PORT || 5000;
// Diagnostic startup logs to help debug CORS / env issues
try{
	console.log('[startup] PORT=', PORT);
	console.log('[startup] FRONTEND_URL=', frontendUrl);
	console.log('[startup] raw CORS_ORIGIN=', rawCors || '<not-set>');
	console.log('[startup] normalized whitelist=', Array.from(normalizedWhitelist).join(', ') || '<empty>');
}catch(e){ /* ignore */ }

app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
