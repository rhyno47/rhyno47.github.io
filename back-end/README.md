# rhyno-backend

Small express backend for authentication (register/login) and job listings API used by the static frontend.

## Setup
1. Copy `.env.example` to `.env` and fill required variables (`MONGODB_URI`, `JWT_SECRET`).
2. Install dependencies: `npm install` (run in `back-end` folder).
3. Start server locally: `npm run dev` (auto-restarts) or `npm start`.
4. Test health (local): visit `http://localhost:5000/` should return `{ ok: true }`. In production use your Render URL (e.g. `https://your-service.onrender.com/`).

### Environment Variables
| Name | Required | Description |
|------|----------|-------------|
| MONGODB_URI | yes | Primary MongoDB connection string (SRV or standard). |
| MONGODB_URI_FALLBACK | no | Secondary non-SRV connection string used if primary fails. |
| JWT_SECRET | yes | Secret for signing auth tokens. Change to a long random string. |
| HF_API_TOKEN | no | HuggingFace Inference API token (enables real AI responses). |
| HF_MODEL | no | Model name (default `gpt2`). |
| CORS_ORIGIN | no | Comma-separated list of allowed origins (e.g. `https://rhyno47.github.io`). |

If `CORS_ORIGIN` is omitted the server falls back to `*` (all origins). Prefer setting explicit origins in production.

### Render Deployment (Backend Hosting)
1. Push the latest code to GitHub (`main` branch).
2. In Render: New + → Web Service → Connect repo `rhyno47.github.io`.
3. Set Root Directory to `back-end` (so Render runs inside that folder).
4. Environment → Add variables shown above (at minimum `MONGODB_URI` and `JWT_SECRET`).
5. Build Command: (leave blank – Render will run `npm install` automatically) or explicitly `npm install`.
6. Start Command: `npm start`.
7. (Optional) Add a Persistent Disk if you want to retain uploaded images across deploys:
	 - Add Disk → Size (e.g. 1GB) → Mount Path `/opt/render/project/src/back-end/uploads`.
8. Save & Deploy. First deploy should show `Server listening on port ...` in logs.
9. Test health endpoint: open the Render service URL root (`/`) or `/api/jobs`.

Auto-Deploy: Enable "Auto deploy" on Render so new pushes to `main` trigger redeploys.

### Frontend → Backend Calls
From GitHub Pages (static frontend) call the backend using the Render service URL, for example:
```javascript
fetch('https://your-service.onrender.com/api/jobs')
	.then(r => r.json())
	.then(console.log);
```

If you encounter CORS issues ensure `CORS_ORIGIN` includes `https://rhyno47.github.io`.

### Frontend configuration (env.js)
The static site reads a public runtime config from `assets/env.js` and expects a global `window.API_BASE`.

- File: `assets/env.js`
- Value: set to your deployed backend base URL without a trailing slash.

Example:
```html
<script src="/assets/env.js"></script>
<script>
	// Now window.API_BASE is available
	fetch(window.API_BASE + '/api/jobs').then(r=>r.json()).then(console.log);
</script>
```

Caching note: GitHub Pages can cache aggressively. If you update `env.js` and don’t see changes, do a hard refresh (Ctrl+F5) or append a cache buster when referencing it:
```html
<script src="/assets/env.js?v=2025-11-08"></script>
```

### MongoDB Atlas IP allowlist (Render)
Atlas blocks connections by default. Ensure your Render service can reach the cluster:

1. In MongoDB Atlas → Network Access → Add IP Address.
	 - Option A (recommended): Add Render’s outbound IPs (Render shows them under your service → Networking). Add each IP/CIDR individually.
	 - Option B (temporary): Add 0.0.0.0/0 to allow all. Use only for testing, then remove.
2. Verify credentials in your `MONGODB_URI` (user, password, database) and that the user has the right roles.
3. Redeploy the Render service after changes to env vars.
4. Check logs for `MongoDB connected`.

## Endpoints
- `POST /api/auth/register` — register user (body: { name, email, password })
- `POST /api/auth/login` — login (body: { email, password })
- `GET /api/jobs` — public list of jobs
- `POST /api/jobs` — create job (protected, body: { title, company, location, description, contact })

## MongoDB connection troubleshooting

If you see errors like `MongooseError: Operation users.findOne() buffering timed out` or `queryTxt ETIMEOUT <your-cluster>.mongodb.net`, follow these steps:

- Verify `MONGODB_URI` in `.env` is correct and uses the credentials/cluster you created in Atlas.
- Test DNS/SRV resolution from this machine:
	- PowerShell: `Resolve-DnsName <your-cluster>.mongodb.net -Type SRV`
	- nslookup: `nslookup -type=SRV <your-cluster>.mongodb.net`
- If SRV lookups fail, try switching your DNS server temporarily to `8.8.8.8` (Google DNS) or test from another network.
- As a workaround, Atlas provides a non-SRV connection string (mongodb://host1:27017,host2:27017,...) which you can paste into `MONGODB_URI` instead of `mongodb+srv://`.
- Ensure Atlas network access allows your IP (or add 0.0.0.0/0 temporarily for testing).
- Check firewall, VPN or corporate network settings that might block DNS or outbound DB ports.

The DB connector (`src/config/db.js`) now uses a 10s server selection timeout and prints helpful troubleshooting tips on failure.

If you'd like I can add a small diagnostics script to automatically run DNS checks and surface the recommended next steps.

## Diagnostics scripts
In `back-end/scripts/` you'll find two helpers:

- `diagnose-mongo.ps1` — PowerShell script that runs SRV/TXT lookups, `nslookup`, and `Test-NetConnection` to help identify DNS/port connectivity issues. Run it like:

```powershell
cd "c:\Users\It's Rhyno\rhyno47.github.io\back-end\scripts"
.\diagnose-mongo.ps1 iamrhyno.sato79q.mongodb.net
```

- `convert-srv-to-standard.js` — Node script that attempts to resolve SRV records for a `mongodb+srv://` host and prints a suggested non-SRV `mongodb://host1:27017,host2:27017` string you can paste into `.env`. Run it like:

```powershell
node convert-srv-to-standard.js "mongodb+srv://your-user:your-pass@iamrhyno.sato79q.mongodb.net"
```

Use these to diagnose and, if necessary, build a temporary non-SRV connection string for `MONGODB_URI`.

## Production Hardening Checklist
- Set a strong `JWT_SECRET` (>= 32 random chars).
- Restrict `CORS_ORIGIN` to your known frontend domains.
- Disable Mongoose debug logging by removing `mongoose.set('debug', true);` once stable.
- Add rate limiting middleware (e.g. `express-rate-limit`) for auth and AI endpoints.
- Configure a backup strategy for MongoDB (Atlas snapshots or backups).

