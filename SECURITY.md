# Security Policy

## Supported versions

Security fixes are applied on the latest `main` branch and deployed via Vercel when merged.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by opening a [GitHub Security Advisory](https://github.com/joka-7/JobFlowTracker/security/advisories/new) (preferred) or by contacting the maintainer through GitHub.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected area (Drive sync, Google sign-in, Android app, AI data handling, etc.)

We aim to acknowledge reports within a few days and will coordinate disclosure once a fix is ready.

## Scope notes

- **No server-side copy of user data.** Sync goes from the browser (or the Android app) straight to the user's own Google Drive `appDataFolder` with the `drive.appdata` scope; the operator has no database. `firestore.rules` denies all access to the old Firestore project.
- The OAuth client ID (`VITE_GOOGLE_CLIENT_ID`) is public by design. The Drive access token is kept in `localStorage` for its one-hour life; sign-out clears it together with the device's copy of the data.
- Local data is tagged with the account that owns it (`jft_data_owner_v1`); connecting as another account discards it rather than merging it into that account's Drive.
- AI API keys are stored only in the user's browser (`localStorage`), not on project servers. Users should treat keys as sensitive on shared devices.
- **Share links are disabled.** There is no shared storage; each user's data is visible only to their own Google account.
- Job and chat content sent to AI providers is transmitted from the browser using the user's own API key.

## Pre-release checks (maintainers)

Before merging security-sensitive changes or cutting a release:

```bash
gitleaks detect --source . --verbose
npm audit --audit-level=high
npm test
```

CI also runs Gitleaks, `npm audit`, Trivy, and CodeQL on pushes and PRs to `main` (see `.github/workflows/security.yml`).

## Deployment hardening

- Publish the deny-all Firestore rules from [`firestore.rules`](firestore.rules) to the retired Firebase project.
- List only the real site origins under the OAuth Web client's **Authorized JavaScript origins**.
- Keep the Android release keystore and its password in a password manager; CI reads them only from repository secrets (see `docs/LLD.md`, Android app).
- Vercel serves the security headers via [`vercel.json`](vercel.json) (`Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS). It is the only copy of the CSP — `index.html` deliberately has no `<meta>` CSP, so the two can't drift apart. `script-src` has no `'unsafe-inline'`: the Vite build emits no inline scripts.
