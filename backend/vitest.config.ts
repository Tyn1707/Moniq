import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    globalSetup: ['src/__tests__/global-setup.ts'],
    // The suite shares one SQLite file, so files must not run concurrently.
    fileParallelism: false,
    poolOptions: { threads: { singleThread: true } },
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      JWT_SECRET: 'test-only-jwt-secret-value-not-used-in-production-0123456789',
      JWT_EXPIRES_IN: '1h',
      COOKIE_SECURE: 'false',
      CORS_ORIGIN: 'http://localhost:5173',
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
