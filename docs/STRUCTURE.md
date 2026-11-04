# Repository structure

Every file in this repo and what is inside it. The tree below is **generated** —
run `python .ai/skills/repo_tree/gen_tree.py --project . --output docs/STRUCTURE.md`
to refresh it, and never edit between the markers by hand.

<!-- BEGIN GENERATED TREE (depth=all entries=all) -->
```text
JobFlowTracker/
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md         # GitHub issue template: bug report
│   │   ├── config.yml
│   │   └── feature_request.md    # GitHub issue template: feature request
│   ├── workflows/
│   │   ├── android.yml
│   │   ├── ci.yml
│   │   ├── docs.yml
│   │   └── security.yml
│   ├── copilot-instructions.md   # Copilot's copy of AGENTS.md (generated)
│   ├── dependabot.yml
│   └── pull_request_template.md  # Summary
├── android/
│   ├── app/
│   │   ├── src/
│   │   │   └── main/
│   │   │       ├── java/
│   │   │       │   └── io/
│   │   │       │       └── github/
│   │   │       │           └── joka7/
│   │   │       │               └── jobflowtracker/
│   │   │       │                   └── MainActivity.java
│   │   │       ├── res/
│   │   │       │   ├── drawable/
│   │   │       │   │   ├── ic_launcher_background.xml
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-land-hdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-land-mdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-land-xhdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-land-xxhdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-land-xxxhdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-port-hdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-port-mdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-port-xhdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-port-xxhdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-port-xxxhdpi/
│   │   │       │   │   └── splash.png
│   │   │       │   ├── drawable-v24/
│   │   │       │   │   └── ic_launcher_foreground.xml
│   │   │       │   ├── layout/
│   │   │       │   │   └── activity_main.xml
│   │   │       │   ├── mipmap-anydpi-v26/
│   │   │       │   │   ├── ic_launcher.xml
│   │   │       │   │   └── ic_launcher_round.xml
│   │   │       │   ├── mipmap-hdpi/
│   │   │       │   │   ├── ic_launcher.png
│   │   │       │   │   ├── ic_launcher_foreground.png
│   │   │       │   │   └── ic_launcher_round.png
│   │   │       │   ├── mipmap-mdpi/
│   │   │       │   │   ├── ic_launcher.png
│   │   │       │   │   ├── ic_launcher_foreground.png
│   │   │       │   │   └── ic_launcher_round.png
│   │   │       │   ├── mipmap-xhdpi/
│   │   │       │   │   ├── ic_launcher.png
│   │   │       │   │   ├── ic_launcher_foreground.png
│   │   │       │   │   └── ic_launcher_round.png
│   │   │       │   ├── mipmap-xxhdpi/
│   │   │       │   │   ├── ic_launcher.png
│   │   │       │   │   ├── ic_launcher_foreground.png
│   │   │       │   │   └── ic_launcher_round.png
│   │   │       │   ├── mipmap-xxxhdpi/
│   │   │       │   │   ├── ic_launcher.png
│   │   │       │   │   ├── ic_launcher_foreground.png
│   │   │       │   │   └── ic_launcher_round.png
│   │   │       │   ├── values/
│   │   │       │   │   ├── ic_launcher_background.xml
│   │   │       │   │   ├── strings.xml
│   │   │       │   │   └── styles.xml
│   │   │       │   └── xml/
│   │   │       │       └── file_paths.xml
│   │   │       └── AndroidManifest.xml
│   │   ├── .gitignore
│   │   ├── build.gradle
│   │   ├── capacitor.build.gradle
│   │   └── proguard-rules.pro
│   ├── gradle/
│   │   └── wrapper/
│   │       ├── gradle-wrapper.jar
│   │       └── gradle-wrapper.properties
│   ├── .gitignore
│   ├── build.gradle
│   ├── capacitor.settings.gradle
│   ├── gradle.properties
│   ├── gradlew
│   ├── gradlew.bat
│   ├── settings.gradle
│   └── variables.gradle
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
│   ├── helpers.js
│   ├── jobseeker-flow.spec.js
│   ├── mode-selection.spec.js
│   ├── multi-tab-sync.spec.js
│   ├── performance-large-dataset.spec.js
│   ├── privacy.spec.js
│   └── recruiter-flow.spec.js
├── public/
│   ├── apple-touch-icon-180x180.png
│   ├── favicon.ico
│   ├── favicon.svg
│   ├── github-repo-icon.png
│   ├── icons.svg
│   ├── maskable-icon-512x512.png
│   ├── privacy.html
│   ├── pwa-192x192.png
│   ├── pwa-512x512.png
│   └── pwa-64x64.png
├── scripts/                      # Bundle-size check + icon generation scripts
│   ├── check-bundle-size.mjs
│   ├── check-npm-audit.mjs
│   ├── generate-icons.py         # Generate favicon, PWA and Android launcher/splash images from the JF monogram…
│   └── icon-master.png
├── src/                          # App source — mode gate, per-mode UIs, shared services
│   ├── __tests__/                # Vitest unit + integration tests
│   │   ├── APIKeySettings.modelPicker.test.jsx
│   │   ├── APIKeySettings.test.jsx
│   │   ├── App.integration.test.jsx
│   │   ├── App.test.jsx
│   │   ├── AppErrorBoundary.test.jsx
│   │   ├── ChatModal.aiConfig.test.jsx
│   │   ├── ChatModal.test.jsx
│   │   ├── JobTrackerApp.simulation.test.jsx
│   │   ├── ModeSelection.test.jsx
│   │   ├── Onboarding.test.jsx
│   │   ├── TasksApp.logic.test.js
│   │   ├── TasksApp.test.jsx
│   │   ├── aiAssistant.rateLimiting.test.js
│   │   ├── aiAssistant.test.js
│   │   ├── boardOrder.test.js
│   │   ├── cloudSync.test.js
│   │   ├── crashBackup.test.js
│   │   ├── csv.test.js
│   │   ├── driveSync.test.js
│   │   ├── effortScale.test.js
│   │   ├── focusPull.test.js
│   │   ├── journey.test.js
│   │   ├── logic.test.js
│   │   ├── nativeGoogleAuth.test.js
│   │   ├── normalizeInterviewType.test.js
│   │   ├── offlineSync.test.jsx
│   │   ├── pendingSync.test.js
│   │   ├── promptSafety.test.js
│   │   ├── pwaUpdate.test.js
│   │   ├── recurrence.test.js
│   │   ├── reminders.test.js
│   │   ├── sanitize.test.js
│   │   ├── security.test.js
│   │   ├── statuses.test.js
│   │   ├── storageKeys.e2eParity.test.js
│   │   ├── taskHelpers.test.js
│   │   ├── taskPriority.test.js
│   │   ├── taskTypes.test.js
│   │   ├── templateQuestions.test.js
│   │   ├── useBackGestureGuard.test.js
│   │   ├── useCloudSync.test.js
│   │   ├── usePwaInstall.test.js
│   │   ├── useTaskReminders.test.js
│   │   ├── useToast.test.js
│   │   └── utils.test.js
│   ├── assets/                   # Static assets bundled by Vite
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/               # UI components, one file per component
│   │   ├── AIAssistant.jsx       # Floating AI panel (job seeker only)
│   │   ├── APIKeySettings.jsx
│   │   ├── AppBrandMark.jsx
│   │   ├── AppErrorBoundary.jsx
│   │   ├── AppFooter.jsx
│   │   ├── BulkActionsBar.jsx    # Sticky bar for bulk status/export/delete on selection
│   │   ├── CalendarView.jsx
│   │   ├── CardColorPicker.jsx
│   │   ├── ChatModal.jsx
│   │   ├── DriveDataSection.jsx
│   │   ├── EffortPicker.jsx
│   │   ├── GithubIcon.jsx
│   │   ├── KanbanDndBoard.jsx
│   │   ├── LabelPicker.jsx
│   │   ├── LanguageSwitcher.jsx
│   │   ├── MarkdownText.jsx
│   │   ├── MobileOverflowMenu.jsx
│   │   ├── ModeDropdown.jsx      # Header mode switcher
│   │   ├── ModeSelection.jsx     # First-launch 3-mode picker
│   │   ├── Onboarding.jsx        # First-visit wizard (job seeker only)
│   │   ├── PriorityBadge.jsx
│   │   ├── PriorityView.jsx
│   │   ├── RejectionAnalysis.jsx
│   │   ├── ResumeReview.jsx
│   │   ├── RoutineReminderFields.jsx
│   │   ├── SearchFilter.jsx      # Search box + multi-status filter pills (list view)
│   │   ├── TemplateLibrary.jsx
│   │   ├── Tooltip.jsx
│   │   ├── TypeBadge.jsx
│   │   ├── TypePicker.jsx
│   │   ├── TypeView.jsx
│   │   └── UpdateBanner.jsx
│   ├── data/                     # Static/reference data
│   │   ├── interviewTemplates.js
│   │   └── taskTemplates.js
│   ├── hooks/                    # Custom hooks: cloud sync, toast, back-gesture guard
│   │   ├── useBackGestureGuard.js
│   │   ├── useCloudSync.js
│   │   ├── useModalA11y.js
│   │   ├── useTaskReminders.js
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
│   │   ├── crashBackup.js
│   │   ├── csv.js
│   │   ├── date.js
│   │   ├── effortScale.js
│   │   ├── focusPull.js
│   │   ├── labelColors.js
│   │   ├── notes.js
│   │   ├── pendingSync.js
│   │   ├── promptSafety.js
│   │   ├── recurrence.js
│   │   ├── reminders.js
│   │   ├── saveFile.js
│   │   ├── taskHelpers.js
│   │   ├── taskPriority.js
│   │   ├── taskTypes.js
│   │   └── templateQuestions.js
│   ├── App.jsx                   # Mode gate — lazy-loads JobTrackerApp or TasksApp so a user in one mode never…
│   ├── JobTrackerApp.jsx         # Job seeker + recruiter UI
│   ├── TasksApp.jsx              # Task manager UI with step management
│   ├── driveSync.js              # Google Drive appDataFolder sync (one file per device)
│   ├── i18n.js                   # React-i18next setup
│   ├── index.css
│   ├── main.jsx
│   ├── modeldispatcher.config.js
│   ├── nativeGoogleAuth.js
│   ├── pwaUpdate.js
│   ├── sanitize.js
│   ├── statuses.js               # Status configs for all 3 modes, storage keys
│   ├── storageKeys.js
│   └── usePwaInstall.js
├── .ai                           # Ogen-ai submodule — the shared source of rules, skills and the ai-sync…
├── .env.example
├── .gitignore
├── .gitleaks.toml
├── .gitmodules
├── .markdownlint.json
├── .npmauditignore
├── .trivyignore
├── AGENTS.md                     # The compiled coding rules every AI assistant reads — generated, do not…
├── CHANGELOG.md                  # Changelog
├── CLAUDE.md                     # Claude Code's copy of AGENTS.md (generated)
├── CONTRIBUTING.md               # Contributing to JobFlowTracker
├── GEMINI.md                     # Gemini CLI's copy of AGENTS.md (generated)
├── LICENSE
├── README.md                     # JobFlowTracker
├── SECURITY.md                   # Security Policy
├── ai-config.toml                # Which rule fragments and target tools ai-sync compiles for this repo
├── capacitor.config.json
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
