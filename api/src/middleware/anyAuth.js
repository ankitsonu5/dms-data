'use strict';

const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

// Accepts tokens from both admin and user roles
// Verifies tokenVersion to prevent concurrent sessions (CWE-613)
async function anyAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (typeof payload.tv === 'number') {
      if (payload.role === 'admin') {
        const Admin = require('../models/Admin');
        const admin = await Admin.findById(payload.sub).lean();
        if (!admin || admin.tokenVersion !== payload.tv) {
          return res
            .status(401)
            .json({ error: 'Session expired. Please login again.' });
        }
      } else if (payload.role === 'user') {
        const User = require('../models/User');
        const user = await User.findById(payload.sub).lean();
        if (!user || user.tokenVersion !== payload.tv) {
          return res
            .status(401)
            .json({ error: 'Session expired. Please login again.' });
        }
      }
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Only user role with tokenVersion check
async function userAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, getJwtSecret());
    if (payload.role !== 'user')
      return res.status(403).json({ error: 'Forbidden' });

    if (typeof payload.tv === 'number') {
      const User = require('../models/User');
      const user = await User.findById(payload.sub).lean();
      if (!user || user.tokenVersion !== payload.tv) {
        return res
          .status(401)
          .json({ error: 'Session expired. Please login again.' });
      }
    }

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { anyAuth, userAuth };
