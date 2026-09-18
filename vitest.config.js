import { defineConfig } from 'vitest/config';

process.env.NODE_ENV = 'test';
process.env.OTP_EXPOSE_CODE_FOR_TESTS = 'true';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.js'],
  },
});
