'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
const { auth } = require('../middleware/auth');

const router = express.Router();

// List users (admins)
router.get('/', auth, async (_req, res) => {
  const items = await Admin.find({}, { passwordHash: 0 }).sort({ createdAt: -1 });
  res.json(items);
});

// Create user
router.post('/', auth, async (req, res) => {
  const { email, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const created = await Admin.create({ email: String(email).toLowerCase().trim(), passwordHash, role: role || 'admin' });
    const out = created.toObject();
    delete out.passwordHash;
    res.status(201).json(out);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: 'email already exists' });
    throw e;
  }
});

// Update user (email and/or password)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const { email, password, role } = req.body || {};
  const update = {};
  if (email) update.email = String(email).toLowerCase().trim();
  if (role) update.role = role;
  if (password) update.passwordHash = await bcrypt.hash(password, 10);

  const updated = await Admin.findByIdAndUpdate(id, { $set: update }, { new: true, projection: { passwordHash: 0 } });
  if (!updated) return res.status(404).json({ error: 'not found' });
  res.json(updated);
});

// Delete user
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const del = await Admin.findByIdAndDelete(id);
  if (!del) return res.status(404).json({ error: 'not found' });
  res.json({ ok: true });
});

module.exports = router;

