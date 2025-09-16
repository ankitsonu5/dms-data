'use strict';

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

dotenv.config();

async function run() {
  const mongoUri = process.env.MONGODB_URI;
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || '';

  if (!mongoUri) throw new Error('MONGODB_URI is not set');
  if (!email || !password) throw new Error('ADMIN_EMAIL or ADMIN_PASSWORD not set');

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await Admin.findOneAndUpdate(
    { email },
    { email, passwordHash, role: 'admin' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log('Admin upserted:', { email: result.email, id: result._id.toString() });
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

