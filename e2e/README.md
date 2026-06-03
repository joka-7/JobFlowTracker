# E2E tests (Playwright)

```bash
npm run test:e2e
```

Uses `npm run dev` on port 5199 (see `playwright.config.js`).

## Tasks mode welcome

`initTasksApp` must set `hasCompletedOnboarding_tasks` (not `hasCompletedOnboarding`). See `src/storageKeys.js` and `storageKeys.e2eParity.test.js`.
