import { registerSW } from 'virtual:pwa-register';

const listeners = new Set();
let updateSW = null;

/** Register the service worker and notify subscribers when a new version is
 * waiting. Call once, at app startup. */
export function initPwaUpdate() {
  if (!import.meta.env.PROD) return;
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
