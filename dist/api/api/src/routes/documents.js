"use strict";
const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Document = require("../models/Document");
const { auth } = require("../middleware/auth");
const router = express.Router();
const uploadsDir = path.resolve(__dirname, "../../uploads");
fs.mkdirSync(uploadsDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9_.-]+/g, "_");
    cb(null, `${ts}-${safe}`);
  }
});
const allowed = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);
function fileFilter(_req, file, cb) {
  if (allowed.has(file.mimetype))
    cb(null, true);
  else
    cb(new Error("Unsupported file type"), false);
}
const upload = multer({ storage, fileFilter, limits: { fileSize: 25 * 1024 * 1024 } });
router.get("/", auth, async (_req, res) => {
  const docs = await Document.find().sort({ createdAt: -1 });
  res.json(docs);
});
router.post("/", auth, upload.single("file"), async (req, res) => {
  const { title, description } = req.body;
  if (!req.file)
    return res.status(400).json({ error: "File is required" });
  const doc = await Document.create({
    title,
    description,
    fileName: req.file.originalname,
    mimeType: req.file.mimetype,
    size: req.file.size,
    path: req.file.filename,
    ownerEmail: req.user?.email
  });
  res.status(201).json(doc);
});
router.put("/:id", auth, upload.single("file"), async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;
  const doc = await Document.findById(id);
  if (!doc)
    return res.status(404).json({ error: "Not found" });
  if (typeof title === "string" && title)
    doc.title = title;
  if (typeof description !== "undefined")
    doc.description = description;
  if (req.file) {
    try {
      fs.unlinkSync(path.join(uploadsDir, doc.path));
    } catch {
    }
    doc.fileName = req.file.originalname;
    doc.mimeType = req.file.mimetype;
    doc.size = req.file.size;
    doc.path = req.file.filename;
  }
  await doc.save();
  res.json(doc);
});
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findByIdAndDelete(id);
  if (!doc)
    return res.status(404).json({ error: "Not found" });
  try {
    fs.unlinkSync(path.join(uploadsDir, doc.path));
  } catch {
  }
  res.json({ ok: true });
});
router.get("/:id/file", auth, async (req, res) => {
  const { id } = req.params;
  const doc = await Document.findById(id);
  if (!doc)
    return res.status(404).json({ error: "Not found" });
  const filePath = path.join(uploadsDir, doc.path);
  if (!fs.existsSync(filePath))
    return res.status(404).json({ error: "File missing" });
  res.setHeader("Content-Type", doc.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${doc.fileName.replace(/"/g, "")}"`);
  fs.createReadStream(filePath).pipe(res);
});
module.exports = router;
//# sourceMappingURL=documents.js.map
