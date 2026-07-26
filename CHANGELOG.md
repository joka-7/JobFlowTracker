# Changelog

All notable changes to this project are documented here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project uses
[Semantic Versioning](https://semver.org/).

There was no version tracking before `1.0.0` — `package.json` sat at
`0.0.0` for the project's entire history, so no meaningful per-release diff
can be reconstructed before this point. See `git log` for the full commit
history.

## [Unreleased]

### Changed
- Corrected doc drift: `docs/HLD.md` and `docs/RECRUITER_MODE.md` referenced
  the removed `ModeSwitcher` component (replaced by `ModeDropdown`) and
  described AI availability inaccurately.
- Renamed the header "Connect Drive" sign-in button and its related status
  messages (all 3 locales) — the button signs into Firebase/Google, not
  Google Drive; the label was a leftover from the removed `driveSync.js`.

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
