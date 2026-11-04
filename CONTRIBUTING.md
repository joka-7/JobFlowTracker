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

### Google Drive sync when developing

Everyday UI work needs nothing: without `VITE_GOOGLE_CLIENT_ID` the app runs offline-only and hides **Connect Drive**.

To work on sync, create your own OAuth Web client (see [README — Backend setup](README.md#backend-setup-maintainers--self-hosters-only)), add `http://localhost:5173` to its authorized origins, and put the client ID in `.env.local` (copy [`.env.example`](.env.example)).

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

Optionally scan for secrets before pushing (see [README — Secret scanning](README.md#secret-scanning-gitleaks)):

```bash
gitleaks detect --source .
```

5. Push to your fork and open a pull request against `main`.

## Pull request guidelines

- Describe **what** changed and **why**.
- Link related issues (`Fixes #123`).
- Keep PRs reasonably scoped; split large work if needed.
- UI changes: mention which mode you tested (job seeker / recruiter) and languages if relevant.
- Ensure CI passes (tests, build, security workflows).

### Reviews and merging (`main`)

The **Protect Main Branch** ruleset requires:

- A pull request (no direct pushes to `main`)
- **One approving review** from someone other than the author
- Green required checks: `test-and-build`, `Gitleaks`, `npm audit`, `Trivy`, `CodeQL`

The repository owner can merge their own PRs after CI passes without a separate approval (ruleset bypass). **Contributors** should request review from a maintainer and wait for approval before merge.

## Code areas

| Area | Location |
|------|----------|
| Main UI | `src/JobTrackerApp.jsx`, `src/components/` |
| Modes / statuses | `src/statuses.js`, `docs/LLD.md` |
| Drive sync | `src/driveSync.js`, `src/hooks/useCloudSync.js`, `src/utils/cloudSync.js`, `src/utils/pendingSync.js` |
| Android | `android/`, `capacitor.config.json`, `src/nativeGoogleAuth.js`, `.github/workflows/android.yml` |
| AI | `src/services/aiAssistant.js`, `src/components/AIAssistant.jsx` |
| Tests | `src/__tests__/`, `e2e/` |
| i18n | `src/locales/*.json` |

When changing how sync merges or stores data, update `docs/HLD.md` (data flow) and `docs/LLD.md` (§ 3–4) in the same commit.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
