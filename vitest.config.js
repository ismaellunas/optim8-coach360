import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{js,mjs,ts}'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
