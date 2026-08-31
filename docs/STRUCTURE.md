# Repository structure

Every file in this repo and what is inside it. The tree below is **generated** —
run `python .ai/skills/repo_tree/gen_tree.py --project . --output docs/STRUCTURE.md`
to refresh it, and never edit between the markers by hand.

<!-- BEGIN GENERATED TREE (depth=all entries=all) -->
```text
jobflowtracker/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md         # GitHub issue template: bug report
│   │   ├── config.yml
│   │   └── feature_request.md    # GitHub issue template: feature request
│   ├── workflows/
│   │   ├── ci.yml
│   │   └── security.yml
│   ├── dependabot.yml
│   └── pull_request_template.md  # Summary
├── docs/
│   ├── screenshots/              # Screenshots referenced from README.md
│   │   ├── calendar-day-detail.png
│   │   ├── calendar-view.png
│   │   ├── jobseeker-ai-assistant.png
│   │   ├── jobseeker-board.png
│   │   ├── jobseeker-company-detail.png
│   │   ├── jobseeker-list.png
│   │   ├── jobseeker-mode.png
│   │   ├── jobseeker-stats.png
│   │   ├── jobseeker-timeline.png
│   │   ├── mode-selection.png
│   │   ├── mode-switcher.png
│   │   ├── recruiter-ai-assistant.png
│   │   ├── recruiter-board.png
│   │   ├── recruiter-candidate-detail.png
│   │   ├── recruiter-list.png
│   │   ├── recruiter-mode.png
│   │   ├── recruiter-stats.png
│   │   ├── tasks-board.png
│   │   ├── tasks-list.png
│   │   └── tasks-stats.png
│   ├── .structure-notes.toml     # This file — notes for files that can't describe themselves
│   ├── HLD.md                    # JobFlowTracker — High Level Design
│   ├── LLD.md                    # JobFlowTracker — Low Level Design
│   └── STRUCTURE.md              # Repository structure
├── e2e/                          # Playwright end-to-end tests
│   ├── README.md                 # E2E tests (Playwright)
│   ├── accessibility.spec.js
│   ├── ai-rate-limiting.spec.js
│   ├── chat-simulation.spec.js
│   ├── dark-mode.spec.js
│   ├── firebase-security-rules.spec.js
│   ├── helpers.js
│   ├── jobseeker-flow.spec.js
│   ├── mode-selection.spec.js
│   ├── multi-tab-sync.spec.js
│   ├── performance-large-dataset.spec.js
│   └── recruiter-flow.spec.js
├── public/
│   ├── apple-touch-icon-180x180.png
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── github-repo-icon.png
│   ├── icons.svg
│   ├── maskable-icon-512x512.png
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa-64x64.png
├── scripts/                      # Bundle-size check + icon generation scripts
│   ├── check-bundle-size.mjs
│   ├── generate-icons.py         # Generate favicon and PWA PNG sizes from the JF monogram master image.
│   └── icon-master.png
├── src/                          # App source — mode gate, per-mode UIs, shared services
│   ├── __tests__/                # Vitest unit + integration tests
│   │   ├── APIKeySettings.test.jsx
│   │   ├── App.integration.test.jsx
│   │   ├── ChatModal.aiConfig.test.jsx
│   │   ├── ChatModal.test.jsx
│   │   ├── JobTrackerApp.simulation.test.jsx
│   │   ├── ModeSelection.test.jsx
│   │   ├── Onboarding.test.jsx
│   │   ├── TasksApp.logic.test.js
│   │   ├── aiAssistant.rateLimiting.test.js
│   │   ├── aiAssistant.test.js
│   │   ├── boardOrder.test.js
│   │   ├── cloudSync.test.js
│   │   ├── csv.test.js
│   │   ├── journey.test.js
│   │   ├── logic.test.js
│   │   ├── normalizeInterviewType.test.js
│   │   ├── offlineSync.test.jsx
│   │   ├── promptSafety.test.js
│   │   ├── security.test.js
│   │   ├── statuses.test.js
│   │   ├── storageKeys.e2eParity.test.js
│   │   ├── templateQuestions.test.js
│   │   ├── useBackGestureGuard.test.js
│   │   └── utils.test.js
│   ├── assets/                   # Static assets bundled by Vite
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/               # UI components, one file per component
│   │   ├── AIAssistant.jsx       # Floating AI panel (job seeker only)
│   │   ├── APIKeySettings.jsx
│   │   ├── AppBrandMark.jsx
│   │   ├── BulkActionsBar.jsx    # Sticky bar for bulk status/export/delete on selection
│   │   ├── CalendarView.jsx
│   │   ├── CardColorPicker.jsx
│   │   ├── ChatModal.jsx
│   │   ├── KanbanDndBoard.jsx
│   │   ├── LabelPicker.jsx
│   │   ├── LanguageSwitcher.jsx
│   │   ├── MarkdownText.jsx
│   │   ├── MobileOverflowMenu.jsx
│   │   ├── ModeDropdown.jsx      # Header mode switcher
│   │   ├── ModeSelection.jsx     # First-launch 3-mode picker
│   │   ├── Onboarding.jsx        # First-visit wizard (job seeker only)
│   │   ├── RejectionAnalysis.jsx
│   │   ├── ResumeReview.jsx
│   │   ├── SearchFilter.jsx      # Search box + multi-status filter pills (list view)
│   │   ├── TemplateLibrary.jsx
│   │   ├── Tooltip.jsx
│   │   └── UpdateBanner.jsx
│   ├── data/                     # Static/reference data
│   │   ├── interviewTemplates.js
│   │   └── taskTemplates.js
│   ├── hooks/                    # Custom hooks: cloud sync, toast, back-gesture guard
│   │   ├── useBackGestureGuard.js
│   │   ├── useCloudSync.js
│   │   └── useToast.js
│   ├── locales/                  # I18n translation files: English, Hebrew, French
│   │   ├── templateQuestions/
│   │   │   ├── en.js
│   │   │   ├── fr.js
│   │   │   └── he.js
│   │   ├── en.json
│   │   ├── fr.json
│   │   └── he.json
│   ├── services/                 # Service-layer integrations
│   │   └── aiAssistant.js
│   ├── utils/                    # Small focused utilities: CSV export, file save, date formatting, avatar…
│   │   ├── avatarColor.js
│   │   ├── boardOrder.js
│   │   ├── cloudSync.js
│   │   ├── csv.js
│   │   ├── date.js
│   │   ├── labelColors.js
│   │   ├── notes.js
│   │   ├── promptSafety.js
│   │   ├── saveFile.js
│   │   └── templateQuestions.js
│   ├── App.jsx                   # Mode gate — lazy-loads JobTrackerApp or TasksApp so a user in one mode never…
│   ├── JobTrackerApp.jsx         # Job seeker + recruiter UI
│   ├── TasksApp.jsx              # Task manager UI with step management
│   ├── firebase.js               # Auth + mode-aware Firestore helpers
│   ├── i18n.js                   # React-i18next setup
│   ├── index.css
│   ├── main.jsx
│   ├── pwaUpdate.js
│   ├── sanitize.js
│   ├── statuses.js               # Status configs for all 3 modes, storage keys
│   ├── storageKeys.js
│   └── usePwaInstall.js
├── .gitignore
├── .gitleaks.toml
├── .markdownlint.json
├── .npmrc
├── .trivyignore
├── CHANGELOG.md                  # Changelog
├── CLAUDE.md                     # Claude Code Session Info
├── CONTRIBUTING.md               # Contributing to JobFlowTracker
├── LICENSE
├── README.md                     # JobFlowTracker
├── SECURITY.md                   # Security Policy
├── eslint.config.js
├── firestore.rules
├── index.html
├── package-lock.json
├── package.json
├── playwright.config.js
├── postcss.config.js
├── tailwind.config.js
├── vercel.json
└── vite.config.js
```
<!-- END GENERATED TREE -->
