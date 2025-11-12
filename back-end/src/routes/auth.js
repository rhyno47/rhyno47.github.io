const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');
// Feature flag: turn email verification on/off (future enable). Set EMAIL_VERIFY_ENABLED=true to activate.
const EMAIL_VERIFY_ENABLED = /^true$/i.test(process.env.EMAIL_VERIFY_ENABLED || '');

// Lazy-load SendGrid only when verification is enabled to avoid hard dependency when off
let sgMail = null;
if(EMAIL_VERIFY_ENABLED && process.env.SENDGRID_API_KEY){
  try {
    sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  } catch (e) {
    console.warn('[email] @sendgrid/mail not installed; email verify disabled at runtime');
  }
}

async function sendVerificationEmail(user){
  if(!EMAIL_VERIFY_ENABLED){
    return; // disabled globally
  }
  if(!process.env.SENDGRID_API_KEY){
    console.warn('[email] SENDGRID_API_KEY not set; skipping email send');
    return;
  }
  if(!sgMail){
    try{ sgMail = require('@sendgrid/mail'); sgMail.setApiKey(process.env.SENDGRID_API_KEY); }
    catch(e){ console.warn('[email] @sendgrid/mail not available; skipping send'); return; }
  }
  const baseUrl = (process.env.FRONTEND_URL || 'https://rhyno47.github.io').replace(/\/$/, '');
  const tokenId = crypto.randomUUID();
  // Sign short-lived JWT carrying user id and tokenId
  const vtoken = jwt.sign({ sub: String(user._id), tid: tokenId, email: user.email }, process.env.JWT_SECRET || 'changeme', { expiresIn: '30m' });
  const apiBase = (process.env.API_PUBLIC_URL || process.env.BACKEND_URL || (process.env.RENDER_EXTERNAL_URL || '')).replace(/\/$/, '');
  const verifyUrl = (apiBase ? apiBase : '') + `/api/auth/verify?token=${encodeURIComponent(vtoken)}`;
  // Prefer a friendly frontend page when FRONTEND_URL is configured
  const href = baseUrl ? (baseUrl + '/verify.html?token=' + encodeURIComponent(vtoken)) : verifyUrl;
  const from = process.env.MAIL_FROM || 'no-reply@' + (new URL(baseUrl)).hostname;
  await User.updateOne({ _id: user._id }, { $set: { emailVerificationTokenId: tokenId, emailVerificationSentAt: new Date() } });
  const msg = {
    to: user.email,
    from,
    subject: 'Verify your email',
    html: `<p>Hi ${user.name || ''},</p><p>Confirm your email to finish setting up your account.</p><p><a href="${href}">Verify Email</a></p><p>This link expires in 30 minutes.</p>`
  };
  await sgMail.send(msg).catch(e=>{ console.error('[email] send error', e.response?.body || e.message || e); });
}

// POST /api/auth/register
router.post('/register', [
  body('name').notEmpty().withMessage('Name required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ message: 'Email already in use' });
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    // Auto-set verified when feature disabled
    user = new User({ name, email, password: hash, emailVerified: !EMAIL_VERIFY_ENABLED });
    await user.save();
    if(EMAIL_VERIFY_ENABLED){
      // Fire-and-forget email verification (non-blocking)
      sendVerificationEmail(user).catch(()=>{});
    }
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified }, verify: { enabled: EMAIL_VERIFY_ENABLED, sent: EMAIL_VERIFY_ENABLED && !!process.env.SENDGRID_API_KEY } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, emailVerified: user.emailVerified } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/auth/verify?token=...
router.get('/verify', async (req, res) => {
  const token = String(req.query.token || '');
  if(!token) return res.status(400).json({ message: 'Missing token' });
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    const userId = payload.sub || payload.id;
    const tid = payload.tid;
    const user = await User.findById(userId);
    if(!user) return res.status(400).json({ message: 'Invalid token' });
    if(user.emailVerified) return res.json({ ok: true, already: true });
    if(user.emailVerificationTokenId && tid && user.emailVerificationTokenId !== tid){
      return res.status(400).json({ message: 'Token superseded' });
    }
    user.emailVerified = true;
    user.emailVerificationTokenId = undefined;
    await user.save();
    return res.json({ ok: true });
  }catch(e){
    return res.status(400).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;
