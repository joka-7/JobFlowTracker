import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: 'list',
  timeout: 45_000,
  globalTimeout: process.env.CI ? 12 * 60 * 1000 : undefined,
  expect: { timeout: 15_000 },
  use: {
    baseURL: 'http://127.0.0.1:5199',
    trace: 'on-first-retry',
    actionTimeout: process.env.CI ? 30_000 : 20_000,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: process.env.CI
      ? 'npm run build && npm run preview -- --host 127.0.0.1 --port 5199 --strictPort'
      : 'npm run dev -- --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 180_000 : 120_000,
  },
});
