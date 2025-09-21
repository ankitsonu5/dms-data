"use strict";
const express = require("express");
const router = express.Router();
const Category = require("../models/Category");
const auth = require("../middleware/auth");
router.get("/", auth, async (_req, res) => {
  const cats = await Category.find().sort({ name: 1 });
  res.json(cats);
});
router.post("/", auth, async (req, res) => {
  const { name } = req.body;
  if (!name || !String(name).trim())
    return res.status(400).json({ error: "Name required" });
  try {
    const created = await Category.create({ name: String(name).trim() });
    res.status(201).json(created);
  } catch (e) {
    if (e.code === 11e3)
      return res.status(409).json({ error: "Category already exists" });
    res.status(500).json({ error: "Failed to create category" });
  }
});
router.put("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || !String(name).trim())
    return res.status(400).json({ error: "Name required" });
  try {
    const updated = await Category.findByIdAndUpdate(
      id,
      { $set: { name: String(name).trim() } },
      { new: true }
    );
    if (!updated)
      return res.status(404).json({ error: "Not found" });
    res.json(updated);
  } catch (e) {
    if (e.code === 11e3)
      return res.status(409).json({ error: "Category already exists" });
    res.status(500).json({ error: "Failed to update category" });
  }
});
router.delete("/:id", auth, async (req, res) => {
  const { id } = req.params;
  const deleted = await Category.findByIdAndDelete(id);
  if (!deleted)
    return res.status(404).json({ error: "Not found" });
  res.json({ ok: true });
});
module.exports = router;
//# sourceMappingURL=categories.js.map
