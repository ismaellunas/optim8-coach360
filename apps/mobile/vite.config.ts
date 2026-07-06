import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: path.resolve(__dirname, '../..'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@coach360/domain': path.resolve(__dirname, '../../packages/domain/src/index.ts'),
      '@coach360/api': path.resolve(__dirname, '../../packages/api/src/index.ts'),
    },
  },
});
