# Email Verification

This backend uses SendGrid to send verification emails on user registration. A short‑lived JWT link is sent; hitting `/api/auth/verify?token=...` marks the user as verified.

## Environment variables

- SENDGRID_API_KEY: Your SendGrid API key
- JWT_SECRET: Secret for signing verification and auth tokens
- FRONTEND_URL: Canonical frontend, e.g. https://rhyno47.github.io
- API_PUBLIC_URL: Public base URL of this API (e.g. Render URL) used for building verify links
- MAIL_FROM: Optional from address (defaults to no-reply@<FRONTEND_URL host>)

## Flows

1. Register (`POST /api/auth/register`)
   - Creates user with `emailVerified=false`
   - Sends verification email in the background
2. Verify (`GET /api/auth/verify?token=...`)
   - Validates token
   - Sets `emailVerified=true`

Responses from `login` and `register` include `emailVerified` in the user payload.

## Local run

- Install deps and start server
