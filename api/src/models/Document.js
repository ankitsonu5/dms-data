'use strict';

const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    category: { type: String, trim: true },
    fileName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    path: { type: String, required: true },
    // Uploader (optional later)
    ownerEmail: { type: String, trim: true },
  },
  { timestamps: true }
);

// Indexes for faster filtering/sorting on large datasets
DocumentSchema.index({ createdAt: -1 });
DocumentSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('Document', DocumentSchema);

