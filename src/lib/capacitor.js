import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

/**
 * Configure native shell plugins on iOS/Android. No-op in the browser.
 */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  await StatusBar.setStyle({ style: Style.Dark });
  await StatusBar.setBackgroundColor({ color: '#0C0C10' });
  await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
}
