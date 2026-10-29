import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

/**
 * Configure native shell plugins on iOS/Android. No-op in the browser.
 */
export async function initNativeShell() {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: '#0B0E14' });
    }
    await Keyboard.setResizeMode({ mode: KeyboardResize.None });
  } catch (error) {
    console.warn('initNativeShell failed', error);
  }
}

/**
 * Hooks the Android hardware/gesture back button to an in-app handler.
 * No-op in the browser. Returns an unregister function.
 */
export function registerBackButtonHandler(onBackButton) {
  if (!Capacitor.isNativePlatform()) return function () {};

  var listenerHandle = CapacitorApp.addListener('backButton', onBackButton);
  return function unregister() {
    listenerHandle.then(function (handle) { handle.remove(); }).catch(function () {});
  };
}

/** Exits the app (used when there is no in-app screen left to go back to). */
export function exitApp() {
  if (!Capacitor.isNativePlatform()) return;
  CapacitorApp.exitApp();
}

/**
 * Hooks custom-URL-scheme deep links (e.g. the Supabase password recovery
 * link) to an in-app handler. No-op in the browser. Returns an unregister
 * function. Also checks the launch URL for the cold-start case.
 */
export function registerAppUrlOpenHandler(onUrlOpen) {
  if (!Capacitor.isNativePlatform()) return function () {};

  CapacitorApp.getLaunchUrl().then(function (result) {
    if (result?.url) onUrlOpen(result.url);
  });

  var listenerHandle = CapacitorApp.addListener('appUrlOpen', function (event) {
    onUrlOpen(event.url);
  });
  return function unregister() {
    listenerHandle.then(function (handle) { handle.remove(); }).catch(function () {});
  };
}
