# E2E tests (Playwright)

## Running locally

```bash
npm run test:e2e
```

## Mode setup (do not duplicate keys in helpers)

Browser tests skip onboarding/welcome modals via **`src/storageKeys.js`** and **`e2e/modeInit.js`**.

| Mode       | Required localStorage (see `E2E_MODE_INIT`) |
|------------|---------------------------------------------|
| Job seeker | `appMode`, `hasCompletedOnboarding`         |
| Recruiter  | `appMode` only                              |
| Tasks      | `appMode`, **`hasCompletedOnboarding_tasks`** |

Tasks uses a **different** welcome key than job seeker. Using `hasCompletedOnboarding` for Tasks leaves the welcome overlay open and breaks clicks (CI timeouts).

When adding a new mode or welcome flow:

1. Add the key to `src/storageKeys.js`.
2. Add a preset to `E2E_MODE_INIT`.
3. Extend `src/__tests__/storageKeys.e2eParity.test.js`.
4. Use `applyModeInit(page, '…')` in `e2e/helpers.js`.
5. Chat tests: AI keys live in `E2E_AI_STORAGE` inside each preset (one init script).
6. Call `dismissBlockingOverlays()` before header clicks if a modal might appear.

## CI web server

E2E uses **`npm run dev`** (Vite), not `npm run build && preview`. A production build pulls in `@anthropic-ai/sdk` Node modules and floods CI logs with “externalized for browser compatibility” warnings; dev matches how earlier PRs ran and is enough for Playwright.

## CI timeouts

CI uses Playwright `globalTimeout` and limited retries so a stuck test cannot run for an hour. Fix flakes in code; do not rely on many retries.
