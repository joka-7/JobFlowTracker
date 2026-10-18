import { registerSW } from 'virtual:pwa-register';
import { Capacitor } from '@capacitor/core';

const listeners = new Set();
let updateSW = null;

/** Register the service worker and notify subscribers when a new version is
 * waiting. Call once, at app startup. */
export function initPwaUpdate() {
  // Inside the Android app the bundled files are the app: a service worker
  // there would keep serving the previous build after an update.
  if (!import.meta.env.PROD || Capacitor.isNativePlatform()) return;
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      listeners.forEach(fn => fn());
    },
  });
}

/** Subscribe to "new version available" notifications. Returns an unsubscribe fn. */
export function onPwaNeedRefresh(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/** Activate the waiting service worker and reload to run the new version. */
export function applyPwaUpdate() {
  if (updateSW) updateSW(true);
}
