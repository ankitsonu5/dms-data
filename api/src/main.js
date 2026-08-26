'use strict';

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRouter = require('./routes/auth');
const documentsRouter = require('./routes/documents');
const usersRouter = require('./routes/users');
const categoriesRouter = require('./routes/categories');
const paymentsRouter = require('./routes/payments');
const userAuthRouter = require('./routes/userAuth');
const { auth } = require('./middleware/auth');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const host = process.env.HOST || 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const mongoUri = process.env.MONGODB_URI || '';

async function start() {
  if (!mongoUri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Mongo connect failed', err);
    process.exit(1);
  }

  const app = express();
  app.disable('x-powered-by');

  // Behind nginx (TLS terminates there); trust it so HSTS is emitted and the
  // client IP is accurate for rate limiting.
  app.set('trust proxy', 1);

  // Security response headers — closes audit findings #8 (Missing Security
  // Headers, CWE-693), #9 (Clickjacking, CWE-1021), and the HSTS part of #10
  // (Credential transmitted in plaintext, CWE-319). This is a JSON API, so the
  // CSP is locked down: deny framing and disallow any embedded/active content.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"], // clickjacking (#9)
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      // Force HTTPS for two years incl. subdomains (#10 / CWE-319)
      hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' }, // X-Frame-Options: DENY (#9)
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginEmbedderPolicy: false,
    })
  );

  // Rate limiting — 100 req/15 min globally (fixes CWE-770 No Rate Limiting)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: { error: 'Too many requests, please try again later' },
      skip: (req) => req.path === '/health',
    })
  );

  app.use(express.json());
  // Razorpay Hosted Checkout posts its callback as application/x-www-form-urlencoded
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: [
        /^https?:\/\/localhost(?::\d+)?$/,
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/,
        /^https?:\/\/dms-vns-01\.protoninternet\.com(?::\d+)?$/,
      ],
      credentials: false,
    })
  );

  app.use('/auth', authRouter);
  app.use('/documents', documentsRouter);
  app.use('/users', usersRouter);
  app.use('/categories', categoriesRouter);
  app.use('/payments', paymentsRouter);
  app.use('/user', userAuthRouter);
  app.get('/stats', auth, async (_req, res) => {
    const Document = require('./models/Document');
    const Admin = require('./models/Admin');
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const [documentsTotal, documentsToday, usersTotal] = await Promise.all([
      Document.countDocuments({}),
      Document.countDocuments({ createdAt: { $gte: start, $lte: end } }),
      Admin.countDocuments({}),
    ]);
    res.json({ documentsTotal, documentsToday, usersTotal });
  });

  app.get('/health', (_req, res) => {
    res.send({ ok: true });
  });

  app.get('/', (_req, res) => {
    res.send({ message: 'API is running' });
  });

  app.listen(port, host, () => {
    console.log(`[ ready ] http://${host}:${port}`);
  });
}

start();
