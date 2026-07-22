import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { normalizeSupabaseUrl } from '../../packages/api/src/client/normalize-supabase-url.ts';

function readViteEnv(mode: string, envDir: string): Record<string, string> {
  const fromFiles = loadEnv(mode, envDir, 'VITE_');
  const merged: Record<string, string> = { ...fromFiles };

  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('VITE_') && value !== undefined) {
      merged[key] = value;
    }
  }

  return merged;
}

function assertSupabaseBuildEnv(mode: string, envDir: string): void {
  if (mode !== 'production') {
    return;
  }

  const env = readViteEnv(mode, envDir);
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY at build time. Set them in Vercel Production env or repo .env.',
    );
  }

  normalizeSupabaseUrl(url);
}

export default defineConfig(({ mode }) => {
  const envDir = path.resolve(__dirname, '../..');
  assertSupabaseBuildEnv(mode, envDir);

  return {
    plugins: [react(), tailwindcss()],
    envDir,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
      dedupe: ['react', 'react-dom', 'styled-components', 'sanity'],
    },
    optimizeDeps: {
      include: ['sanity', '@sanity/vision', 'styled-components'],
    },
    server: {
      port: 5174,
    },
  };
});
