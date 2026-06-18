# JobFlowTracker — High Level Design

## 1. Overview

JobFlowTracker is a single-page application (SPA) for tracking a job search, a recruiter hiring pipeline, or multi-step task management. Users choose a starting mode on first visit and can switch freely at any time using the header mode switcher. All modes use a kanban-based UI with mode-specific statuses and form fields. Each mode's data is stored in its own scoped localStorage key and Firestore subcollection — switching modes never affects other modes' data.

**Key design principles:**

- **No custom backend.** All business logic runs in the browser. Firebase provides auth and a database; Vercel provides static hosting.
- **Three modes, freely switchable.** `App.jsx` gates on `localStorage.appMode`. `ModeSwitcher` in every header lets users move between modes at runtime. Each mode's data persists independently.
- **Client-side AI (job seeker only).** AI requests run from the browser with the user's API key. Recruiter and task manager modes do not expose the AI Assistant.
- **User-isolated data.** Firestore rules allow each user read/write on `users/{userId}/**`.
- **Offline-first local cache.** Data is written to mode-scoped localStorage keys on every mutation.
- **Granular writes.** Each mutation calls `updateItem(uid, mode, item)` for the affected document only.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              React 19 SPA (Vite build)              │     │
│  │                                                     │     │
│  │  App.jsx  (mode gate + autoOnboarding flag)         │     │
│  │    ├── ModeSelection  (first visit, 3 options)      │     │
│  │    ├── JobTrackerApp  (job seeker | recruiter)      │     │
│  │    │     ├── Kanban Board (drag & drop)             │     │
│  │    │     ├── List / Edit view                       │     │
│  │    │     ├── Timeline view                          │     │
│  │    │     ├── Calendar view (interviews + deadlines) │     │
│  │    │     └── Stats view (Hiring Funnel)             │     │
│  │    └── TasksApp  (task manager)                     │     │
│  │          ├── Kanban Board (4 columns)               │     │
│  │          ├── List / Step-detail view                │     │
│  │          ├── Calendar view (task due dates)         │     │
│  │          └── Stats view                             │     │
│  │                                                     │     │
│  │  Shared: ModeSwitcher, AIAssistant, APIKeySettings, │     │
│  │    ChatModal, ResumeReview, RejectionAnalysis,      │     │
│  │    TemplateLibrary, Onboarding, Tooltip             │     │
│  │                                                     │     │
│  │  Services: aiAssistant.js (provider abstraction)   │     │
│  │  Firebase module: firebase.js                       │     │
│  │  i18n: react-i18next  (EN / HE / FR)               │     │
│  │                                                     │     │
│  │  localStorage: appMode, per-mode data cache, AI cfg │     │
│  └───────────────┬─────────────────────┬───────────────┘     │
└──────────────────┼─────────────────────┼─────────────────────┘
                   │ HTTPS               │ HTTPS
         ┌─────────┴──────────┐    ┌─────┴──────────────────────┐
         │   Firebase (GCP)   │    │      AI Providers          │
         │                    │    │                            │
         │  Firebase Auth     │    │  Google Gemini SSE         │
         │  (Google OIDC)     │    │  Groq (OpenAI-compat SSE)  │
         │                    │    │  Anthropic (SDK streaming)  │
         │  Firestore         │    │  OpenAI (SSE)              │
         │  /users/{uid}/     │    │  Ollama (local NDJSON)     │
         │    companies/      │    └────────────────────────────┘
         │    candidates/     │
         │    tasks/          │    ┌──────────────────────┐
         │                    │    │   Vercel CDN         │
         └────────────────────┘    │  (static hosting)    │
                                   └──────────────────────┘
```

---

## 3. Components Table

| File | Type | Responsibility |
|---|---|---|
| `src/App.jsx` | Root | Mode gate: `ModeSelection`, `JobTrackerApp`, or `TasksApp`; tracks `autoOnboarding` flag |
| `src/statuses.js` | Config | `STATUSES_JOBSEEKER`, `STATUSES_RECRUITER`, `STATUSES_TASKS`, `STEP_STATUSES`, storage keys, `getCollectionName`, `resolveInitialAppMode` |
| `src/components/ModeSelection.jsx` | Full-screen | First-launch 3-mode picker (job seeker / recruiter / task manager) |
| `src/components/ModeSwitcher.jsx` | Header widget | Icon buttons for enabled modes (filtered via `getEnabledModes()`); updates `localStorage.appMode` and calls `onModeChange`; hidden if only 1 mode enabled |
| `src/components/ModeDropdown.jsx` | Header widget | Compact dropdown variant of the mode switcher (mobile menu); same enabled-modes filtering |
| `src/storageKeys.js` | Config | Canonical localStorage key names; `getEnabledModes()`, `APP_MODES`, e2e init constants |
| `src/JobTrackerApp.jsx` | Main component | Mode-aware UI for job seeker and recruiter; all tabs, Firestore integration |
| `src/TasksApp.jsx` | Main component | Task manager UI: board, list+step-detail, stats; step status cycling |
| `src/firebase.js` | Module | Auth, mode-aware `loadAllItems(uid, mode)`, profile `appMode`, legacy migration |
| `src/components/Onboarding.jsx` | Modal | 5-step wizard (job seeker only, skipped when switching from another mode) |
| `src/services/aiAssistant.js` | Module | Provider configuration, `initAI`, `isAIReady`, all streaming functions |
| `src/components/AIAssistant.jsx` | Floating panel | Sparkles button, menu screen, debrief; launches ChatModal and ResumeReview |
| `src/components/APIKeySettings.jsx` | Modal | Provider selector, API key / Ollama URL input, saves to localStorage |
| `src/components/ChatModal.jsx` | Modal | Multi-turn AI chat with streaming, company context, save-to-notes |
| `src/components/RejectionAnalysis.jsx` | Modal | Rejection AI analysis for a specific company, streaming result |
| `src/components/ResumeReview.jsx` | Modal | Resume paste, calls `getResumeAdvice`, streaming result |
| `src/components/TemplateLibrary.jsx` | Modal | 80+ interview questions, 6 categories, full-text search |
| `src/components/CalendarView.jsx` | View | Monthly calendar grid; receives `events[]`, shows color-coded chips per day, day-detail side panel, RTL-aware, i18n date formatting |
| `src/components/SearchFilter.jsx` | List sub-component | Search input + toggleable multi-status filter pills; reports changes via `onSearch` / `onFilterChange` callbacks |
| `src/components/BulkActionsBar.jsx` | List sub-component | Sticky bar shown when ≥1 item is checkbox-selected; bulk status update, export, delete (with its own confirm modal), and clear-selection actions |
| `src/components/Tooltip.jsx` | Utility | Hover tooltip using Tailwind group/group-hover classes |
| `src/data/interviewTemplates.js` | Data | `TEMPLATES` with 6 category keys |
| `src/locales/en.json` | i18n | English strings (includes `tasks.*` namespace) |
| `src/locales/he.json` | i18n | Hebrew strings (RTL) |
| `src/locales/fr.json` | i18n | French strings |
| `src/i18n.js` | Config | react-i18next initialization, language detection from localStorage |
| `src/main.jsx` | Entry | React root mount, i18n import |

---

## 4. Data Flow

### 4.1 Sign-In Flow

```
User clicks "Connect Drive" / Cloud icon
  → signInWithGoogle()
  → onAuthStateChanged fires
  → loadUserProfile(uid) → confirm or update appMode
  → saveUserProfile(uid, { appMode })
  → loadAllItems(uid, mode)
      → getDocs(/users/{uid}/companies OR /candidates OR /tasks)
      → jobseeker only: legacy root-doc migration if subcollection empty
  → setCompanies / setTasks(data)
```

### 4.2 Mode Selection / Switching Flow

```
First visit (no appMode in localStorage)
  → ModeSelection screen (3 options)
  → user picks jobseeker | recruiter | tasks
  → localStorage.appMode = choice
  → App renders JobTrackerApp or TasksApp
  → jobseeker + autoOnboarding=true: may show Onboarding wizard
  → recruiter / tasks: skip onboarding

Switching via ModeSwitcher (any time)
  → localStorage.appMode = newMode
  → App.setMode(newMode) → re-renders appropriate component
  → autoOnboarding=false → onboarding never shown when switching
  → each mode independently loads its own localStorage cache
```

### 4.3 Data Mutation Flow

Every mutation follows the same pattern: update React state → write localStorage → Firestore write in background.

```
User action (add / edit / drag-drop / step status toggle)
  → setState(newState)
  → useEffect [state] fires
      → localStorage.setItem('jobTrackerAppV2Data_{mode}', JSON.stringify(data))
  → if (user) updateItem(uid, mode, item)

Delete
  → setState(prev.filter(...))
  → if (user) deleteItem(uid, mode, id)

JSON import
  → setState(sanitizedData)
  → if (user) batchSaveItems(uid, mode, sanitizedData)   [chunked writeBatch, 490/batch]
```

### 4.4 Task Step Status Toggle

Steps are cycled without entering edit mode. A click on a step's status icon in the detail panel calls `handleStepStatusToggle(taskId, stepId)`, which updates the task's `steps` array in state and fires `updateItem(uid, 'tasks', task)` to Firestore.

Cycle order: `todo → in_progress → done → blocked → todo`

---

## 5. AI Integration

### Provider Abstraction

All provider-specific configuration lives in the `PROVIDERS` constant in `aiAssistant.js`. The module-level `config` object holds the active selection and is set by `initAI()`. All high-level functions call the internal `runStream(prompt, onChunk)` dispatcher.

### Streaming Approaches

| Provider | Protocol | Parsing |
|---|---|---|
| Gemini | SSE (`alt=sse`) | `candidates[0].content.parts[0].text` |
| Groq | SSE (OpenAI-compat) | `choices[0].delta.content` |
| OpenAI | SSE (OpenAI-compat) | `choices[0].delta.content` |
| Ollama | Newline-delimited JSON | `response` or `message.content` |
| Anthropic | SDK async iterator | `content_block_delta → delta.text` |

All functions accumulate a `full` string and call `onChunk(full)` on each token.

---

## 6. Security Model

### Firestore Rules

```
/users/{uid}                          — read/write: only if request.auth.uid == uid
/users/{uid}/companies/{companyId}    — read/write: only if request.auth.uid == uid
/users/{uid}/candidates/{candidateId} — read/write: only if request.auth.uid == uid
/users/{uid}/tasks/{taskId}           — read/write: only if request.auth.uid == uid
```

### API Keys

AI provider API keys are stored exclusively in `localStorage`. Never sent to any server controlled by this project.

### No Server-Side Code

There is no Express server, Edge function, or cloud function. Vercel serves only static assets. All dynamic behavior is browser-to-third-party HTTPS.

---

## 7. Deployment

```
git push origin main
  → Vercel webhook triggers build
  → vite build  (output: dist/)
  → Vercel deploys dist/ to CDN
```

- **Build command:** `vite build`
- **Output directory:** `dist/`
- **Framework preset:** Vite
- **Environment variables:** None required. Firebase config is in `src/firebase.js` (public project config). AI keys are runtime browser-only.
