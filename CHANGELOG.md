# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/).

There was no version tracking before `1.0.0` — `package.json` sat at
`0.0.0` for the project's entire history, so no meaningful per-release diff
can be reconstructed before this point. See `git log` for the full commit
history.

## [Unreleased]

Sections C–H of the original improvement audit, plus a follow-up pass that
cross-referenced the full audit document (not just the tracked GitHub
issues) against everything that had actually shipped and closed the items
that had been silently missed rather than deliberately deferred.

### Added
- CSV export alongside the existing JSON backup, in both apps (desktop
  toolbar and mobile menu) — `src/utils/csv.js` (RFC 4180 escaping) and
  `saveCsvFile()`.
- A real accessibility test suite (`e2e/accessibility.spec.js`) using
  `@axe-core/playwright`, replacing checks that mostly asserted elements
  merely existed rather than testing any WCAG criterion.
- A bundle-size budget (`scripts/check-bundle-size.mjs`) wired into CI:
  fails the build if any JS chunk exceeds 200kB gzip or the total exceeds
  550kB gzip.

### Changed
- Corrected doc drift: `docs/HLD.md`, `docs/RECRUITER_MODE.md`, and
  README.md's project-structure tree referenced the removed `ModeSwitcher`
  component (replaced by `ModeDropdown`) and described AI availability
  inaccurately.
- Renamed the header "Connect Drive" sign-in button and its related status
  messages (all 3 locales) — the button signs into Firebase/Google, not
  Google Drive; the label was a leftover from the removed `driveSync.js`.
- Deduplicated code shared between `JobTrackerApp.jsx` and `TasksApp.jsx`
  that had drifted into near-identical copies: `MarkdownText`, `safeStr`,
  `avatarColor`/`getInitials`, `formatDate`, the notes-append pattern, the
  Firebase auth/cloud-sync wiring (now `src/hooks/useCloudSync.js`), the
  `showToast` toast helper (`src/hooks/useToast.js`), and the mobile
  overflow-menu chrome plus language selector (`LanguageSwitcher`,
  `MobileOverflowMenu`). `streamChat`'s inline SSE/NDJSON stream parsing
  in `aiAssistant.js` was collapsed to share implementations with
  `runStream` instead of maintaining a second copy.
- Performance: the Anthropic SDK and both `JobTrackerApp`/`TasksApp` are
  now lazy-loaded, dropping the entry bundle from ~738KB to ~366KB; a
  memoization bug where `useCallback` dependency arrays referenced
  functions recreated every render (silently defeating the memoization)
  is fixed; `initialFormState` is now memoized; added a CSP header.
- Unified the divergent back/forward (History API) handling between the
  two apps into `src/hooks/useBackGestureGuard.js`, which also fixed a
  PWA back-gesture exit bug that only affected Task Manager.
- CI/security config: CodeQL results now actually upload (previously
  configured with `upload: never`); ESLint config gained proper Node/
  Vitest globals; `.trivyignore` entries gained expiry dates so CI goes
  red again once a fix ships; GitHub Actions in `ci.yml`/`security.yml`
  are now pinned to resolved commit SHAs instead of mutable version tags;
  `npm audit` no longer skips devDependencies.
- Tracker records now carry an explicit `mode` field instead of being
  classified by sniffing which fields happen to be present — the old
  heuristic could silently drop a minimal recruiter/job-seeker record
  (and then silently omit it from the next write) if it didn't happen to
  have any of the fields the heuristic looked for.
- AI provider calls gained a 60s timeout, cancellation via
  `AbortController` wired through every AI-calling component (closing a
  panel/modal now actually cancels the in-flight request), and output-size
  caps on every provider (previously only Anthropic had one).
- Tightened the CSP `img-src` directive (removed a blanket `https:`
  wildcard that allowed any HTTPS origin) and added
  `Strict-Transport-Security`, `Cross-Origin-Opener-Policy:
  same-origin-allow-popups`, and `Cross-Origin-Resource-Policy:
  same-origin` response headers.

### Fixed
- Several tests that could never fail regardless of the code under test —
  dummy `expect(true).toBe(true)` assertions, and tests asserting against
  their own mocks instead of real app behavior — were rewritten to
  exercise the actual implementation.
- `<html lang>`/`<html dir>` now update on language change (previously
  only an inner `<div>` got `dir="rtl"`, so screen readers announced
  Hebrew/French content with an English voice and the document-level
  scrollbar/context-menu/selection direction never flipped); 13 locale
  keys referenced in code but missing from `en`/`he`/`fr` were added;
  7 components had RTL layout bugs from physical (left/right) instead of
  logical (start/end) positioning; toast notifications gained
  `aria-live="polite"` so they're announced to screen readers.
- `e2e/ai-rate-limiting.spec.js` referenced DOM selectors that didn't
  exist anywhere in the app and had an always-true assertion, so every
  test in the file silently no-op'd instead of exercising the rate
  limiter; rewritten against the real DOM and mocked network.
- The real accessibility scan above turned up genuine WCAG 2.1 AA
  violations, all fixed: the header language `<select>` had no accessible
  name; several `<label>` elements in the company/task forms weren't
  programmatically associated with their input via `htmlFor`/`id`; three
  button/text color combinations were under the 4.5:1 contrast minimum.
- A high-severity `brace-expansion` denial-of-service advisory
  (GHSA-mh99-v99m-4gvg), previously hidden from CI by `npm audit
  --omit=dev` since it only affected a devDependency's build toolchain,
  is now caught and closed via a version override rather than a breaking
  `vite-plugin-pwa` upgrade.

## [1.0.0] - 2026-07-26

First tagged release. Establishes a version baseline; see `git log` for
everything that shipped before it. Includes the first two sections of an
in-progress full-app improvement audit:

### Fixed
- Deleting the last remaining company no longer resurrects it after reload.
- Cloud-synced task data is now sanitized against the field whitelist
  before entering app state, matching the job-seeker/recruiter path.
- The AI request rate limiter now actually runs in the browser (it was
  hardcoded off for every real user).
- New companies/tasks/steps use the existing crypto-random ID generator
  instead of `Date.now()`, removing a same-millisecond collision risk.
- Fixed an in-place mutation of interview state that only worked by
  accident under React's current rendering behavior.
- `CalendarView`'s partial dark-mode styling no longer diverges from the
  rest of the app on a dark-OS visitor.
- French date formatting now works in job-seeker mode (previously only in
  task manager mode).
- The Gemini API key moved out of the request URL query string and into a
  header, and the free-text model name is now URL-encoded.
- Patched `postcss` (high-severity path traversal) and `protobufjs`
  (moderate DoS) advisories.

### Removed
- Deleted `src/security/encryption.js`, `csrf.js`, and `auditLog.js` —
  unused, and not doing what their names claimed (recoverable "encryption"
  key, meaningless CSRF check for a client-only SPA, an in-memory audit
  log that never persisted).
- Deleted `src/driveSync.js` (superseded Google Drive OAuth flow),
  `src/logger.js`, `src/App.css`, `src/components/ModeSwitcher.jsx`
  (replaced by `ModeDropdown`), `src/components/WelcomeModal.jsx`
  (replaced by `Onboarding`), and `src/utils/smartStatusProgression.js` —
  all unreferenced.
- Removed unused exports (`E2E_MODE_INIT`, `E2E_AI_STORAGE` in
  `storageKeys.js`; several back-compat Firestore wrappers in
  `firebase.js`).
