import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export function createSupabaseAuthStorage() {
  if (!Capacitor.isNativePlatform()) {
    return undefined;
  }

  return {
    async getItem(key) {
      const { value } = await Preferences.get({ key });
      return value;
    },
    async setItem(key, value) {
      await Preferences.set({ key, value });
    },
    async removeItem(key) {
      await Preferences.remove({ key });
    },
  };
}
