'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

const router = express.Router();

// Strict rate limit for auth endpoints (fixes CWE-770)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
});

// Email validation (fixes CWE-20 Improper Input Validation)
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Password policy: min 8 chars, at least 1 letter + 1 number (fixes CWE-521)
function validatePassword(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[a-zA-Z]/.test(pw)) return 'Password must contain at least one letter';
  if (!/[0-9]/.test(pw)) return 'Password must contain at least one number';
  return null;
}

function signToken(user) {
  return jwt.sign(
    {
      sub: String(user._id),
      role: 'user',
      email: user.email,
      name: user.name,
      tv: user.tokenVersion, // token version for concurrent-login prevention (CWE-613)
    },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

// POST /user/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    // Input validation (fixes CWE-20)
    if (!name || !String(name).trim())
      return res.status(400).json({ error: 'Name is required' });
    if (String(name).trim().length < 2 || String(name).trim().length > 100)
      return res.status(400).json({ error: 'Name must be 2–100 characters' });
    if (!email) return res.status(400).json({ error: 'Email is required' });
    if (!EMAIL_RE.test(String(email)))
      return res.status(400).json({ error: 'Invalid email format' });

    // Password policy (fixes CWE-521)
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).toLowerCase().trim(),
      passwordHash,
    });
    const token = signToken(user);
    return res
      .status(201)
      .json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    console.error('register error', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /user/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });
    if (!EMAIL_RE.test(String(email)))
      return res.status(400).json({ error: 'Invalid email format' });

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    // Increment tokenVersion — invalidates all previous sessions (CWE-613)
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    const token = signToken(user);
    return res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /user/forgot
router.post('/forgot', authLimiter, async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  if (!EMAIL_RE.test(String(email)))
    return res.status(400).json({ error: 'Invalid email format' });

  const user = await User.findOne({
    email: String(email).toLowerCase().trim(),
  });
  if (!user) return res.json({ ok: true }); // don't reveal if email exists

  const token = jwt.sign(
    { sub: String(user._id), type: 'reset', email: user.email },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '1h' }
  );

  const host = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || smtpUser;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';

  if (host && smtpUser && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user: smtpUser, pass },
      });
      const web = process.env.WEB_URL
        ? String(process.env.WEB_URL).replace(/\/$/, '')
        : '';
      const link = web
        ? `${web}/user-reset?token=${encodeURIComponent(token)}`
        : null;
      const text = link
        ? `Click to reset your password: ${link}\n\nExpires in 1 hour.`
        : `Your password reset token: ${token}`;
      await transporter.sendMail({
        from,
        to: user.email,
        subject: 'Reset your password',
        text,
      });
    } catch (err) {
      console.error('Failed to send reset email', err);
      return res.json({ ok: true, token }); // dev fallback
    }
  } else {
    return res.json({ ok: true, token });
  }
  return res.json({ ok: true });
});

// POST /user/reset
router.post('/reset', authLimiter, async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password)
    return res.status(400).json({ error: 'token and password are required' });

  const pwErr = validatePassword(password);
  if (pwErr) return res.status(400).json({ error: pwErr });

  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.type !== 'reset')
      return res.status(400).json({ error: 'Invalid token type' });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.passwordHash = await bcrypt.hash(password, 12);
    await user.save();
    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
