'use strict';

const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Document = require('../models/Document');
const { auth } = require('../middleware/auth');

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

function fileFilter(_req, file, cb) {
  if (allowed.has(file.mimetype)) cb(null, true);
  else cb(new Error('Unsupported file type'), false);
}

const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } });

// List with optional filters and pagination:
// ?category=..&from=YYYY-MM-DD&to=YYYY-MM-DD&sortBy=createdAt|title|category&sortDir=asc|desc&page=1&limit=20
router.get('/', auth, async (req, res) => {
  const { category, from, to } = req.query || {};
  const filter = {};
  if (category) filter.category = String(category);
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(String(from));
    if (to) {
      const end = new Date(String(to));
      // include entire day
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Sorting
  const allowedSort = new Set(['createdAt', 'title', 'category']);
  const sortBy = allowedSort.has(String(req.query.sortBy || 'createdAt'))
    ? String(req.query.sortBy || 'createdAt')
    : 'createdAt';
  const sortDir = String(req.query.sortDir || 'desc') === 'asc' ? 1 : -1;
  const sort = { [sortBy]: sortDir };

  // Pagination (only apply if both page and limit are provided)
  const page = req.query.page ? Math.max(parseInt(String(req.query.page), 10) || 1, 1) : null;
  const limit = req.query.limit ? Math.max(parseInt(String(req.query.limit), 10) || 1, 1) : null;

  if (page && limit) {
    const total = await Document.countDocuments(filter);
    const items = await Document.find(filter).sort(sort).skip((page - 1) * limit).limit(limit);
    res.set('X-Total-Count', String(total));
    return res.json(items);
  }

  // No pagination requested -> return all (existing behavior)
  const docs = await Document.find(filter).sort(sort);
  res.json(docs);
});

// Create + upload
router.post('/', auth, upload.single('file'), async (req, res) => {
  const { title, description, category } = req.body;
  if (!req.file) return res.status(400).json({ error: 'File is required' });
  const doc = await Document.create({
    title,
    description,
    category,
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
  const { title, description, category } = req.body;

  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ error: 'Not found' });

  if (typeof title === 'string' && title) doc.title = title;
  if (typeof description !== 'undefined') doc.description = description;
  if (typeof category !== 'undefined') doc.category = category;

  if (req.file) {
    try { fs.unlinkSync(path.join(uploadsDir, doc.path)); } catch {}
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
  try { fs.unlinkSync(path.join(uploadsDir, doc.path)); } catch {}
  res.json({ ok: true });
});

// Download
router.get('/:id/file', auth, async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findById(id);
  if (!doc) return res.status(404).json({ error: 'Not found' });
  const filePath = path.join(uploadsDir, doc.path);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File missing' });
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${doc.fileName.replace(/"/g, '')}"`);
  fs.createReadStream(filePath).pipe(res);
});

module.exports = router;

