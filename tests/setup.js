import { beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { env } from '../src/config/env.js';

if (env.NODE_ENV !== 'test') {
  throw new Error('Tests must run with NODE_ENV=test. Refusing to connect to a non-test database.');
}

if (!/test/i.test(env.MONGO_URI)) {
  throw new Error('MONGO_TEST_URI must identify a dedicated test database.');
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(env.MONGO_URI);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});
