# JobFlowTracker — High Level Design

## 1. Overview

JobFlowTracker is a single-page application (SPA) for tracking a personal job search **or a recruiter hiring pipeline**. Users choose their role once at first launch (`jobseeker` or `recruiter`). Both modes use the same kanban UI with mode-specific statuses, labels, and form fields. All views read from a single in-memory array mirrored to mode-scoped localStorage and optionally synced to Firestore.

**Key design principles:**

- **No custom backend.** There is no server-side API. All business logic runs in the browser. Firebase provides auth and a database; Vercel provides static hosting.
- **Dual mode, fixed at launch.** `App.jsx` gates on `localStorage.appMode`. Mode selection is shown once; legacy users with existing data default to `jobseeker`. See [RECRUITER_MODE.md](RECRUITER_MODE.md).
- **Client-side AI (job seeker only).** AI requests run from the browser with the user's API key. Recruiter mode hides the AI Assistant in v1.
- **User-isolated data.** Firestore rules allow each user read/write on `users/{userId}/**` (profile, `companies`, `candidates`).
- **Offline-first local cache.** Data is written to mode-scoped localStorage keys on every mutation.
- **Granular writes.** Each mutation calls `updateItem(uid, mode, item)` for the affected document.

---

## 2. Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐     │
│  │              React 18 SPA (Vite build)              │     │
│  │                                                     │     │
│  │  JobTrackerApp.jsx  (state + handlers)              │     │
│  │    ├── Kanban Board (drag & drop)                   │     │
│  │    ├── List / Edit view                             │     │
│  │    ├── Timeline view                                │     │
│  │    └── Stats view (Hiring Funnel)                   │     │
│  │                                                     │     │
│  │  Components: AIAssistant, APIKeySettings,           │     │
│  │    ChatModal, ResumeReview, RejectionAnalysis,      │     │
│  │    TemplateLibrary, Onboarding, Tooltip             │     │
│  │                                                     │     │
│  │  Services: aiAssistant.js (provider abstraction)    │     │
│  │  Firebase module: firebase.js                       │     │
│  │  i18n: react-i18next  (EN / HE / FR)               │     │
│  │                                                     │     │
│  │  localStorage: appMode, companies/candidates cache, AI config │
│  └───────────────┬─────────────────────┬───────────────┘     │
└──────────────────┼─────────────────────┼─────────────────────┘
                   │ HTTPS               │ HTTPS
         ┌─────────┴──────────┐    ┌─────┴──────────────────────┐
         │   Firebase (GCP)   │    │      AI Providers          │
         │                    │    │                            │
         │  ┌──────────────┐  │    │  ┌──────────────────────┐  │
         │  │ Firebase Auth│  │    │  │ Google Gemini SSE    │  │
         │  │ (Google OIDC)│  │    │  │ (generativelanguage  │  │
         │  └──────────────┘  │    │  │  .googleapis.com)    │  │
         │                    │    │  ├──────────────────────┤  │
         │  ┌──────────────┐  │    │  │ Groq                 │  │
         │  │  Firestore   │  │    │  │ (api.groq.com) SSE   │  │
         │  │              │  │    │  ├──────────────────────┤  │
         │  │ /users/{uid}/│  │    │  │ Anthropic Claude     │  │
         │  │  companies/  │  │    │  │ (SDK streaming)      │  │
         │  │  {companyId} │  │    │  ├──────────────────────┤  │
         │  │              │  │    │  │ OpenAI               │  │
         │  │ /shares/{uid}│  │    │  │ (api.openai.com) SSE │  │
         │  └──────────────┘  │    │  ├──────────────────────┤  │
         └────────────────────┘    │  │ Ollama (local)       │  │
                                   │  │ (localhost:11434)     │  │
                                   │  │ newline-delimited JSON│  │
         ┌──────────────────────┐  │  └──────────────────────┘  │
         │   Vercel CDN         │  └────────────────────────────┘
         │  (static hosting)    │
         │  auto-deploy on      │
         │  push to main        │
         └──────────────────────┘
```

---

## 3. Components Table

| File | Type | Responsibility |
|---|---|---|
| `src/App.jsx` | Root | Mode gate: `ModeSelection` or `JobTrackerApp` |
| `src/statuses.js` | Config | `STATUSES_JOBSEEKER`, `STATUSES_RECRUITER`, storage keys, legacy migration |
| `src/components/ModeSelection.jsx` | Full-screen | First-launch job seeker vs recruiter picker |
| `src/JobTrackerApp.jsx` | Main component | Mode-aware UI, all tabs, Firestore integration |
| `src/firebase.js` | Module | Auth, `loadAllItems(uid, mode)`, profile `appMode`, legacy migration |
| `src/components/Onboarding.jsx` | Modal | 5-step wizard (job seeker only) |
| `src/services/aiAssistant.js` | Module | Provider configuration (`PROVIDERS` object), `initAI`, `isAIReady`, all streaming functions per provider, six high-level AI task functions |
| `src/components/AIAssistant.jsx` | Floating panel | Sparkles button, menu screen, debrief screen, launches ChatModal and ResumeReview; calls interview prep, pattern analysis, scheduling advice |
| `src/components/APIKeySettings.jsx` | Modal | Provider selector with FREE badges, API key / Ollama URL input, model override, saves to localStorage, calls `initAI` |
| `src/components/ChatModal.jsx` | Modal | Multi-turn AI chat, streaming message display, company context system prompt, save-to-notes per message |
| `src/components/RejectionAnalysis.jsx` | Modal | Displays rejection data for a specific company, runs `analyzeRejection`, streaming result, save-to-notes |
| `src/components/ResumeReview.jsx` | Modal | Resume paste (up to 3000 chars), calls `getResumeAdvice`, streaming result, save-to-notes |
| `src/components/TemplateLibrary.jsx` | Modal | 80+ interview questions, 6 categories, sidebar navigation, full-text search, copy-to-clipboard |
| `src/components/Onboarding.jsx` | Modal | 5-step wizard, language picker (EN/HE/FR), shown on first visit, sets `hasCompletedOnboarding` in localStorage |
| `src/components/Tooltip.jsx` | Utility | Hover tooltip using Tailwind group/group-hover classes |
| `src/data/interviewTemplates.js` | Data | `TEMPLATES` object with 6 category keys, each containing label, icon, color, and questions array |
| `src/locales/en.json` | i18n | English translation strings |
| `src/locales/he.json` | i18n | Hebrew translation strings (RTL language) |
| `src/locales/fr.json` | i18n | French translation strings |
| `src/i18n.js` | Config | react-i18next initialization, language detection from localStorage |
| `src/main.jsx` | Entry | React root mount, i18n import |

---

## 4. Data Flow

### 4.1 Sign-In Flow

```
User clicks "Connect Drive"
  → signInWithGoogle()
  → onAuthStateChanged fires
  → loadUserProfile(uid) → may confirm appMode
  → saveUserProfile(uid, { appMode })
  → loadAllItems(uid, mode)
      → getDocs(/users/{uid}/companies OR /users/{uid}/candidates)
      → jobseeker only: legacy root-doc migration if subcollection empty
  → setCompanies(data)
```

### 4.1b Mode Selection Flow

```
First visit (no appMode, no legacy data)
  → ModeSelection screen
  → user picks jobseeker | recruiter
  → localStorage.appMode = choice
  → JobTrackerApp renders with mode prop
  → jobseeker: may show Onboarding wizard
  → recruiter: skip onboarding, empty board
```

### 4.2 Data Mutation Flow

Every mutation follows the same pattern: update React state, write to localStorage immediately, then fire a Firestore write in the background (only when a user is signed in).

```
User action (add / edit / drag-drop / AI note save)
  → setCompanies(newState)           [React re-render]
  → useEffect [companies] fires
      → localStorage.setItem('jobTrackerAppV2Data_{mode}', JSON.stringify(companies))
  → if (user) updateItem(uid, mode, item)

User action (delete)
  → setCompanies(prev.filter(...))
  → if (user) deleteFirestoreCompany(uid, id)

JSON import
  → setCompanies(sanitizedData)
  → if (user) batchSaveCompanies(uid, sanitizedData)   [chunked writeBatch, 490/batch]
```

The `isSaved` indicator in the header badge reflects the localStorage write latency (800 ms debounce), not the Firestore write.

### 4.3 AI Request Flow

```
User opens APIKeySettings
  → selects provider, enters API key (or Ollama URL)
  → handleSave()
      → localStorage.setItem('aiProvider', ...)
      → localStorage.setItem('aiApiKey', ...)
      → localStorage.setItem('aiModel', ...)
      → initAI(provider, key, model, ollamaUrl)   [updates module-level config object]

On app mount (useEffect [])
  → reads localStorage AI config
  → initAI(...)    [re-hydrates config after page refresh]

User clicks an AI action button
  → isAIReady() checked   [returns false if no key and not Ollama]
  → if not ready → openSettings()
  → if ready → runStream(prompt, onChunk)
      → dispatches to provider-specific streaming function:
          gemini    → streamGemini()       [SSE fetch, data: lines]
          groq      → streamOpenAICompat() [SSE fetch, OpenAI schema]
          openai    → streamOpenAICompat() [SSE fetch, OpenAI schema]
          ollama    → streamOllama()       [newline-delimited JSON]
          anthropic → streamAnthropic()    [Anthropic SDK async iterator]
      → onChunk(accumulatedText) called on each token
      → React state updated → streaming text rendered live
  → on completion → "Save to notes" button enabled
      → onSaveToCompany(companyId, text) → updateCompany(uid, updatedCompany)
```

Multi-turn chat (`streamChat`) follows the same provider dispatch but sends the full `messages` array instead of a single prompt string.

### 4.4 Share Flow

```
Signed-in user clicks share button (link icon)
  → publishShare(uid, companies)
      → setDoc(/shares/{uid}, { companies, sharedAt })
  → constructs URL: <origin>?share=<uid>
  → navigator.clipboard.writeText(url)
  → setShareCopied(true)  → button shows checkmark for 3s

Recipient visits ?share=<uid>
  → useEffect [] detects URLSearchParams.get('share')
  → setShareMode(true)      [disables all edit controls, shows amber banner]
  → loadSharedData(uid)
      → getDoc(/shares/{uid})   [public read, no auth required]
  → setCompanies(data.companies)
```

The share snapshot is a point-in-time copy. It does not update automatically when the owner changes their data.

---

## 5. AI Integration

### Provider Abstraction

All provider-specific configuration lives in the `PROVIDERS` constant in `aiAssistant.js`. The module-level `config` object holds the active selection and is set by `initAI()`. All high-level functions (`getInterviewPrep`, `analyzeRejection`, etc.) call the internal `runStream(prompt, onChunk)` dispatcher, which reads `config.provider` and routes to the appropriate streaming function.

### Streaming Approaches

| Provider | Protocol | Endpoint | Parsing |
|---|---|---|---|
| Gemini | SSE (`alt=sse`) | `generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent` | `data:` lines → `candidates[0].content.parts[0].text` |
| Groq | SSE (OpenAI-compatible) | `api.groq.com/openai/v1/chat/completions` | `data:` lines → `choices[0].delta.content` |
| OpenAI | SSE (OpenAI-compatible) | `api.openai.com/v1/chat/completions` | `data:` lines → `choices[0].delta.content` |
| Ollama | Newline-delimited JSON | `{ollamaUrl}/api/generate` (single-turn) or `/api/chat` (multi-turn) | Each line parsed as JSON → `response` or `message.content` |
| Anthropic | SDK async iterator | SDK handles transport | `content_block_delta` event → `delta.text` |

All streaming functions accumulate a `full` string and call `onChunk(full)` on each token, so the UI always receives the complete text so far (not a delta). This avoids React state management complexity with incremental appends.

### Privacy Policy

All AI prompts strip personally identifying information before sending:
- Company names and role titles are included (required for relevance).
- Interviewer names entered by the user are never included in any prompt.
- Resume text is truncated to 3000 characters. The UI warns users not to include their own name, email, or phone.
- Interview debrief notes and chat messages display a privacy warning advising users not to include personal names.

---

## 6. Security Model

### Firestore Rules

```
/users/{uid}                          — read/write: only if request.auth.uid == uid
/users/{uid}/companies/{companyId}    — read/write: only if request.auth.uid == uid
/shares/{uid}                         — read: public (no auth required)
                                        write: only if request.auth.uid == uid
```

No other paths exist or are accessible.

### API Keys

AI provider API keys are stored exclusively in `localStorage` in the user's own browser. They are included directly in outbound `fetch` requests from the browser (Authorization header or query parameter for Gemini). They are never sent to any server controlled by this project. Ollama requires no key and connects only to a local URL.

### No Server-Side Code

There is no Express server, Edge function, or cloud function in this project. The Vercel deployment serves only static assets produced by `vite build`. All dynamic behavior (auth, database reads/writes, AI requests) is handled entirely by browser-to-third-party HTTPS calls.

### XSS Mitigation

User-entered data is rendered via React's JSX, which escapes strings by default. The only `dangerouslySetInnerHTML` usage is for a custom scrollbar `<style>` block containing no user input.

---

## 7. Deployment

The app is hosted on Vercel with automatic deployment:

```
git push origin main
  → Vercel webhook triggers build
  → vite build   (output: dist/)
  → Vercel deploys dist/ to CDN edge nodes globally
  → Previous deployment remains live until new deployment passes health check
```

- **Build command:** `vite build`
- **Output directory:** `dist/`
- **Framework preset:** Vite (auto-detected by Vercel)
- **Environment variables:** None required at build time. Firebase config is hardcoded in `src/firebase.js` (public project config, safe per Firebase security model). AI keys are runtime browser-only.
- **SPA routing:** Vercel serves `index.html` for all routes. The `?share=uid` query parameter is read client-side by `URLSearchParams`.
