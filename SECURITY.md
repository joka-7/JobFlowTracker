# Security Policy

## Supported versions

Security fixes are applied on the latest `main` branch and deployed via Vercel when merged.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by opening a [GitHub Security Advisory](https://github.com/joka-7/JobFlowTracker/security/advisories/new) (preferred) or by contacting the maintainer through GitHub.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected area (Firestore rules, auth, AI data handling, etc.)

We aim to acknowledge reports within a few days and will coordinate disclosure once a fix is ready.

## Scope notes

- Firebase web config in `src/firebase.js` is public by design; access control relies on Firestore security rules (`firestore.rules`).
- AI API keys are stored only in the user's browser (`localStorage`), not on project servers. Users should treat keys as sensitive on shared devices.
- **Share links are disabled.** The `/shares` collection is not used; Firestore rules allow only `/users/{uid}` for the signed-in owner.
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

- Publish Firestore rules from [`firestore.rules`](firestore.rules).
- Restrict the Firebase web API key (HTTP referrers) in Google Cloud Console.
- Vercel serves additional headers via [`vercel.json`](vercel.json) (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `frame-ancestors`).
