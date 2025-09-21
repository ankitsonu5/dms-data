"use strict";
const express = require("express");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const cors = require("cors");
const authRouter = require("./routes/auth");
const documentsRouter = require("./routes/documents");
const usersRouter = require("./routes/users");
dotenv.config();
const host = process.env.HOST || "localhost";
const port = process.env.PORT ? Number(process.env.PORT) : 3e3;
const mongoUri = process.env.MONGODB_URI || "";
async function start() {
  if (!mongoUri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Mongo connect failed", err);
    process.exit(1);
  }
  const app = express();
  app.use(express.json());
  app.use(
    cors({
      origin: [/^http:\/\/localhost(?::\d+)?$/, /^http:\/\/127\.0\.0\.1(?::\d+)?$/],
      credentials: false
    })
  );
  app.use("/auth", authRouter);
  app.use("/documents", documentsRouter);
  app.use("/users", usersRouter);
  app.get("/health", (_req, res) => {
    res.send({ ok: true });
  });
  app.get("/", (_req, res) => {
    res.send({ message: "API is running" });
  });
  app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });
}
start();
//# sourceMappingURL=main.js.map
