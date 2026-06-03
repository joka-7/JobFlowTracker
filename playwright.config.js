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
    actionTimeout: 20_000,
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5199 --strictPort',
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
