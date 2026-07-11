'use strict';

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
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

module.exports = router;
