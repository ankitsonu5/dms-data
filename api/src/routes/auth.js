'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const Admin = require('../models/Admin');

const router = express.Router();

function signToken(admin) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const payload = { sub: String(admin._id), role: 'admin', email: admin.email };
  return jwt.sign(payload, secret, { algorithm: 'HS256', expiresIn: '1d' });
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });
    if (!admin) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

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
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    return res.json({ user: { email: payload.email, role: payload.role } });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// Issue password reset token and send email if SMTP is configured
router.post('/forgot', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });
  const admin = await Admin.findOne({ email: String(email).toLowerCase().trim() });
  // Always respond ok to avoid email enumeration
  if (!admin) return res.json({ ok: true });

  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  const token = jwt.sign({ sub: String(admin._id), type: 'reset', email: admin.email }, secret, {
    algorithm: 'HS256',
    expiresIn: '1h',
  });

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || user;
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';

  if (host && user && pass && from) {
    try {
      const transporter = nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
      const web = process.env.WEB_URL ? String(process.env.WEB_URL).replace(/\/$/, '') : '';
      const link = web ? `${web}/reset?token=${encodeURIComponent(token)}` : null;
      const text = link
        ? `You requested a password reset. Click this link to reset your password: ${link}\nIf you did not request this, you can ignore this email.`
        : `Use this password reset token: ${token}`;
      await transporter.sendMail({
        from,
        to: admin.email,
        subject: 'Reset your password',
        text,
      });
      return res.json({ ok: true });
    } catch (err) {
      console.error('Failed to send reset email', err);
      // Fall back to returning token for dev convenience
      return res.json({ ok: true, token });
    }
  }

  // If SMTP not configured, return token for dev
  return res.json({ ok: true, token });
});

// Reset password using token
router.post('/reset', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' });
  try {
    const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
    const payload = jwt.verify(token, secret);
    if (payload.type !== 'reset') return res.status(400).json({ error: 'invalid token type' });
    const admin = await Admin.findById(payload.sub);
    if (!admin) return res.status(404).json({ error: 'user not found' });
    const bcrypt = require('bcryptjs');
    admin.passwordHash = await bcrypt.hash(password, 10);
    await admin.save();
    return res.json({ ok: true });
  } catch (err) {
    return res.status(400).json({ error: 'invalid or expired token' });
  }
});

module.exports = router;

