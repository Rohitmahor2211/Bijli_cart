import { connectDB } from '../config/db.js';
import { PlatformAdmin } from '../models/platformAdmin.model.js';
import bcrypt from 'bcryptjs';

const name = process.env.PLATFORM_ADMIN_BOOTSTRAP_NAME;
const phone = process.env.PLATFORM_ADMIN_BOOTSTRAP_PHONE;
const password = process.env.PLATFORM_ADMIN_BOOTSTRAP_PASSWORD;

if (!name || !phone || !password) {
  throw new Error('Set PLATFORM_ADMIN_BOOTSTRAP_NAME, PLATFORM_ADMIN_BOOTSTRAP_PHONE, and PLATFORM_ADMIN_BOOTSTRAP_PASSWORD before running this script.');
}

await connectDB();
const existing = await PlatformAdmin.findOne({ phone });
if (existing) {
  console.log(`Platform administrator already exists for ${phone}. No changes were made.`);
  process.exit(0);
}

await PlatformAdmin.create({ name, phone, passwordHash: await bcrypt.hash(password, 12), role: 'SUPER_ADMIN' });
console.log(`Platform administrator created for ${phone}.`);
process.exit(0);
