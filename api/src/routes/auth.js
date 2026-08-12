'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const Admin = require('../models/Admin');
const { getJwtSecret } = require('../config/jwt');

const router = express.Router();

// Strict rate limit for auth endpoints (fixes CWE-770)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again in 15 minutes.',
  },
});

// Validate email format (fixes CWE-20)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Password policy: min 8 chars, at least 1 letter + 1 number (fixes CWE-521)
function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
}

function signToken(admin) {
  const secret = getJwtSecret();
  const payload = {
    sub: String(admin._id),
    role: 'admin',
    email: admin.email,
    tv: admin.tokenVersion, // token version for concurrent-login prevention (CWE-613)
  };
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1d' });
}

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    if (!EMAIL_RE.test(String(email)))
      return res.status(400).json({ error: 'Invalid email format' });

    const admin = await Admin.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Increment tokenVersion — invalidates all previous sessions (CWE-613)
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    const token = signToken(admin);
    return res.json({ token, user: { email: admin.email, role: admin.role } });
  } catch (err) {
    console.error('Login error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/me', (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Missing token' });
    const payload = jwt.verify(token, getJwtSecret());
    return res.json({ user: { email: payload.email, role: payload.role } });
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

router.post('/forgot', authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  if (!EMAIL_RE.test(String(email)))
    return res.status(400).json({ error: 'Invalid email format' });

  const admin = await Admin.findOne({
    email: String(email).toLowerCase().trim(),
  });
  if (!admin) return res.json({ ok: true }); // don't reveal if email exists

  const secret = getJwtSecret();
  const token = jwt.sign(
    { sub: String(admin._id), type: 'reset', email: admin.email },
    secret,
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';

  if (host && user && pass && from) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
      const web = process.env.WEB_URL
        ? String(process.env.WEB_URL).replace(/\/$/, '')
        : '';
      const link = web
        ? `${web}/reset?token=${encodeURIComponent(token)}`
        : null;
      const text = link
        ? `You requested a password reset. Click to reset: ${link}\nExpires in 1 hour.`
        : `Password reset token: ${token}`;
      await transporter.sendMail({
        from,
        to: admin.email,
        subject: 'Reset your password',
        text,
      });
      return res.json({ ok: true });
    } catch (err) {
      console.error('Failed to send reset email', err);
      return res.json({ ok: true, token }); // dev fallback
    }
  }
  return res.json({ ok: true, token });
});

router.post('/reset', authLimiter, async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password)
    return res.status(400).json({ error: 'token and password are required' });

  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret);
    if (payload.type !== 'reset')
      return res.status(400).json({ error: 'invalid token type' });
    const admin = await Admin.findById(payload.sub);
    if (!admin) return res.status(404).json({ error: 'user not found' });
    admin.passwordHash = await bcrypt.hash(password, 10);
    await admin.save();
    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ error: 'invalid or expired token' });
  }
});

module.exports = router;
