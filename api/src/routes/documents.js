'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Document = require('../models/Document');
const { auth } = require('../middleware/auth');
const {
  ValidationError,
  validateString,
  validateDate,
  toBoundedInt,
} = require('../utils/validate');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]+/g, '_');
    cb(null, `${ts}-${safe}`);
  },
});

const allowed = new Set([
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function createRateLimiter({ windowMs, maxRequests }) {
  const requestsByIp = new Map();
  return function rateLimiter(req, res, next) {
    const ip = String(req.ip || req.headers['x-forwarded-for'] || 'unknown');
    const now = Date.now();
    const start = now - windowMs;
    const hits = requestsByIp.get(ip) || [];
    const recentHits = hits.filter((ts) => ts > start);

    if (recentHits.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please try again shortly.',
      });
    }

    recentHits.push(now);
    requestsByIp.set(ip, recentHits);
    next();
  };
}

function resolveStoredPath(storedPath) {
  if (typeof storedPath !== 'string' || !storedPath.trim()) {
    throw new Error('Invalid file path');
  }
  if (storedPath.includes('\0')) {
    throw new Error('Invalid file path');
  }
  const normalized = path.posix.normalize(storedPath).replace(/^\/+/, '');
  if (!normalized || normalized.includes('..') || normalized.includes('/')) {
    throw new Error('Invalid file path');
  }
  const resolved = path.resolve(uploadsDir, normalized);
  const uploadsBase = uploadsDir.endsWith(path.sep)
    ? uploadsDir
    : `${uploadsDir}${path.sep}`;
  if (!resolved.startsWith(uploadsBase)) {
    throw new Error('Invalid file path');
  }
  return resolved;
}

function fileFilter(_req, file, cb) {
  if (allowed.has(file.mimetype)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
}

// Validate + sanitize the document metadata payload. Enforced server-side
// regardless of client checks (audit #11 CWE-20, #12 CWE-20).
function validateDocumentBody(body, { titleRequired }) {
  return {
    title: validateString(body.title, 'title', {
      required: titleRequired,
      max: 200,
    }),
    description: validateString(body.description, 'description', { max: 2000 }),
    category: validateString(body.category, 'category', { max: 100 }),
  };
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024 },
});

const documentsLimiter = createRateLimiter({
  windowMs: Number(process.env.DOCUMENTS_RATE_LIMIT_WINDOW_MS || 60_000),
  maxRequests: Number(process.env.DOCUMENTS_RATE_LIMIT_MAX || 120),
});

router.use(documentsLimiter);

// List with optional filters and pagination:
// ?category=..&from=YYYY-MM-DD&to=YYYY-MM-DD&sortBy=createdAt|title|category&sortDir=asc|desc&page=1&limit=20
router.get('/', auth, async (req, res) => {
  const { category } = req.query || {};
  const filter = {};
  let from, to;
  try {
    from = validateDate(req.query.from, 'from');
    to = validateDate(req.query.to, 'to');
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
  if (category) filter.category = String(category);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = from;
    if (to) {
      // include entire day
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }

  // Sorting
  const allowedSort = new Set(['createdAt', 'title', 'category']);
  const sortBy = allowedSort.has(String(req.query.sortBy || 'createdAt'))
    ? String(req.query.sortBy || 'createdAt')
    : 'createdAt';
  const sortDir = String(req.query.sortDir || 'desc') === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  // Pagination (only apply if both page and limit are provided). Bounded to
  // prevent oversized queries via crafted params (audit #12, CWE-20).
  const page = req.query.page
    ? toBoundedInt(req.query.page, { def: 1, min: 1, max: 1_000_000 })
    : null;
  const limit = req.query.limit
    ? toBoundedInt(req.query.limit, { def: 20, min: 1, max: 100 })
    : null;

  if (page && limit) {
    const total = await Document.countDocuments(filter);
    const items = await Document.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit);
    res.set('X-Total-Count', String(total));
    return res.json(items);
  }

  // No pagination requested -> return all (existing behavior)
  const docs = await Document.find(filter).sort(sort);
  res.json(docs);
});

// Create + upload
router.post('/', auth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  let fields;
  try {
    fields = validateDocumentBody(req.body, { titleRequired: true });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }
  const doc = await Document.create({
    title: fields.title,
    description: fields.description,
    category: fields.category,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.filename,
    ownerEmail: req.user?.email,
  });
  res.status(201).json(doc);
});

// Update metadata or replace file
router.put('/:id', auth, upload.single('file'), async (req, res) => {
  const { id } = req.params;

  let fields;
  try {
    fields = validateDocumentBody(req.body, { titleRequired: false });
  } catch (err) {
    if (err instanceof ValidationError) {
      return res.status(400).json({ error: err.message });
    }
    throw err;
  }

  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  if (fields.title) doc.title = fields.title;
  if (typeof req.body.description !== 'undefined') {
    doc.description = fields.description || '';
  }
  if (typeof req.body.category !== 'undefined') {
    doc.category = fields.category || '';
  }

  if (req.file) {
    try {
      fs.unlinkSync(resolveStoredPath(doc.path));
    } catch {}
    doc.fileName = req.file.originalname;
    doc.mimeType = req.file.mimetype;
    doc.size = req.file.size;
    doc.path = req.file.filename;
  }

  await doc.save();
  res.json(doc);
});

// Delete
router.delete('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findByIdAndDelete(id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  // remove file best-effort
  try {
    fs.unlinkSync(resolveStoredPath(doc.path));
  } catch {}
  res.json({ ok: true });
});

// Download
router.get('/:id/file', auth, async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  let filePath;
  try {
    filePath = resolveStoredPath(doc.path);
  } catch {
    return res.status(400).json({ error: 'Invalid stored file path' });
  }
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: 'File missing' });
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${doc.fileName.replace(/"/g, '')}"`
  );
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;
