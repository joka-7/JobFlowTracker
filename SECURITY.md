# Security Policy

## Supported versions

Security fixes are applied on the latest `main` branch and deployed via Vercel when merged.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report security issues privately by opening a [GitHub Security Advisory](https://github.com/joka-7/JobFlowTracker/security/advisories/new) (preferred) or by contacting the maintainer through GitHub.

Include:

- Description of the issue and potential impact
- Steps to reproduce
- Affected area (Firestore rules, auth, share links, AI data handling, etc.)

We aim to acknowledge reports within a few days and will coordinate disclosure once a fix is ready.

## Scope notes

- Firebase web config in `src/firebase.js` is public by design; access control relies on Firestore security rules.
- AI API keys are stored only in the user's browser (`localStorage`), not on project servers.
- Read-only share snapshots live under `/shares/{uid}` and are intentionally world-readable when published by a signed-in user.
