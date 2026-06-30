import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@coach360/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
      '@coach360/api': path.resolve(__dirname, 'packages/api/src/index.ts'),
      '@coach360/ui': path.resolve(__dirname, 'packages/ui/src/index.ts'),
    },
  },
  test: {
    include: ['tests/**/*.test.{js,mjs,ts}'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
