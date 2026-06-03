import { E2E_MODE_INIT } from '../src/storageKeys.js';

/** Apply mode + onboarding flags before navigation (Playwright addInitScript). */
export async function applyModeInit(page, preset) {
  const storage = E2E_MODE_INIT[preset];
  if (!storage) {
    throw new Error(`Unknown e2e mode preset: ${preset}`);
  }
  await page.addInitScript((entries) => {
    localStorage.clear();
    sessionStorage.clear();
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem(key, value);
    }
  }, storage);
}
