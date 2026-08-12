'use strict';

const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

// Admin-only middleware with concurrent-login prevention (CWE-613)
async function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, getJwtSecret());

    // Verify tokenVersion against DB to prevent concurrent sessions
    if (typeof payload.tv === 'number') {
      const Admin = require('../models/Admin');
      const admin = await Admin.findById(payload.sub).lean();
      if (!admin || admin.tokenVersion !== payload.tv) {
        return res
          .status(401)
          .json({ error: 'Session expired. Please login again.' });
      }
    }

    req.user = payload;
    next();
  } catch (e) {
    if (
      e &&
      typeof e.message === 'string' &&
      e.message.includes('JWT_SECRET')
    ) {
      return res
        .status(500)
        .json({ error: 'Server auth configuration is invalid' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { auth };
