import type { SupportedStorage } from '@supabase/supabase-js';

export function createMemoryAuthStorage(initial: Record<string, string> = {}): SupportedStorage {
  const store = new Map<string, string>(Object.entries(initial));

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}
