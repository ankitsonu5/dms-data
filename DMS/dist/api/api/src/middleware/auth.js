'use strict';
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');
function auth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, getJwtSecret());
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
//# sourceMappingURL=auth.js.map
