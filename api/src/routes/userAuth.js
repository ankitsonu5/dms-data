'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const { getJwtSecret } = require('../config/jwt');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: String(user._id), role: 'user', email: user.email, name: user.name },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

// POST /user/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password)
      return res
        .status(400)
        .json({ error: 'Name, email and password are required' });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters' });

    const existing = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (existing)
      return res.status(409).json({ error: 'Email already registered' });

    const passwordHash = await bcrypt.hash(password, 10);
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
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({ token, user: { name: user.name, email: user.email } });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /user/forgot
router.post('/forgot', async (req, res) => {
  const { email } = req.body || {};
  if (!email) return res.status(400).json({ error: 'email is required' });

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
        ? `Click this link to reset your password: ${link}\n\nThis link expires in 1 hour.`
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
    return res.json({ ok: true, token }); // SMTP not configured
  }

  return res.json({ ok: true });
});

// POST /user/reset
router.post('/reset', async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password)
    return res.status(400).json({ error: 'token and password are required' });
  if (password.length < 6)
    return res
      .status(400)
      .json({ error: 'Password must be at least 6 characters' });
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.type !== 'reset')
      return res.status(400).json({ error: 'Invalid token type' });
    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    return res.json({ ok: true });
  } catch {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }
});

module.exports = router;
