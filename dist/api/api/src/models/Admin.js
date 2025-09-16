"use strict";
const mongoose = require("mongoose");
const AdminSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin"], default: "admin" }
  },
  { timestamps: true }
);
AdminSchema.index({ email: 1 }, { unique: true });
module.exports = mongoose.model("Admin", AdminSchema);
//# sourceMappingURL=Admin.js.map
