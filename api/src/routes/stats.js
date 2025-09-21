'use strict';

const express = require('express');
const { auth } = require('../middleware/auth');
const Document = require('../models/Document');
const Admin = require('../models/Admin');

const router = express.Router();

// GET /stats - basic dashboard counters
router.get('/', auth, async (_req, res) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const [documentsTotal, documentsToday, usersTotal] = await Promise.all([
    Document.countDocuments({}),
    Document.countDocuments({ createdAt: { $gte: start, $lte: end } }),
    Admin.countDocuments({}),
  ]);

  res.json({ documentsTotal, documentsToday, usersTotal });
});

module.exports = router;

