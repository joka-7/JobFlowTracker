# Contributing to JobFlowTracker

Thank you for your interest in contributing. This project welcomes bug reports, feature ideas, documentation improvements, and pull requests.

## Before you start

- Search [existing issues](https://github.com/joka-7/JobFlowTracker/issues) to avoid duplicates.
- For larger changes, open an issue first to discuss scope.
- Security vulnerabilities: see [SECURITY.md](SECURITY.md) — do not file public issues for those.

## Development setup

```bash
git clone https://github.com/joka-7/JobFlowTracker.git
cd JobFlowTracker
npm install
npm run dev
```

Open http://localhost:5173

### Firebase when developing

The repo includes a Firebase web config for the hosted app. For everyday UI work you can use local-only mode without signing in.

If you need Firestore sync or Google Sign-In during development:

1. Create your own Firebase project (see [README — Backend setup](README.md#backend-setup-maintainers--self-hosters-only)).
2. Replace the config in `src/firebase.js` with your project's values.
3. Deploy rules from [`firestore.rules`](firestore.rules).

**Do not commit API keys, service account JSON, or `.env` files with secrets.**

## Making changes

1. Fork the repository on GitHub.
2. Create a branch from `main` (e.g. `fix/kanban-drag` or `feat/recruiter-export`).
3. Make focused changes with clear commit messages.
4. Run tests locally before opening a PR:

```bash
npm test              # unit + integration (Vitest)
npm run test:e2e      # Playwright (port 5199)
npm run lint          # ESLint
npm run build         # production build
```

Or run everything:

```bash
npm run test:all && npm run lint && npm run build
```

5. Push to your fork and open a pull request against `main`.

## Pull request guidelines

- Describe **what** changed and **why**.
- Link related issues (`Fixes #123`).
- Keep PRs reasonably scoped; split large work if needed.
- UI changes: mention which mode you tested (job seeker / recruiter) and languages if relevant.
- Ensure CI passes (tests, build, security workflows).

## Code areas

| Area | Location |
|------|----------|
| Main UI | `src/JobTrackerApp.jsx`, `src/components/` |
| Modes / statuses | `src/statuses.js`, `docs/RECRUITER_MODE.md` |
| Firebase | `src/firebase.js`, `firestore.rules` |
| AI | `src/services/aiAssistant.js`, `src/components/AIAssistant.jsx` |
| Tests | `src/__tests__/`, `e2e/` |
| i18n | `src/locales/*.json` |

When changing Firestore rules, update `firestore.rules`, the README rules snippet, and `docs/HLD.md` if behavior changes.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
