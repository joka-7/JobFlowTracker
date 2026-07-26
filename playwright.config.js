import { defineConfig, devices } from '@playwright/test';

// Browser resolution is left to Playwright itself: it honors
// PLAYWRIGHT_BROWSERS_PATH when set, and otherwise uses its own install
// location (see `npx playwright install` in .github/workflows/ci.yml).
// A previous version of this config hardcoded specific numbered-version
// binary paths, which drift out of sync with whatever version actually
// gets installed.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 60_000,
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
