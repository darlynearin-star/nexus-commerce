import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      JWT_SECRET: 'test-secret-for-unit-tests-0123456789',
      JWT_REFRESH_SECRET: 'test-refresh-secret-for-unit-tests-0123456789',
      JWT_ACCESS_TTL: '2h',
      PORT: '4000',
    },
  },
});