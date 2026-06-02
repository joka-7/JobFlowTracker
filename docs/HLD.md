# JobFlowTracker — High Level Design

## 1. Overview

JobFlowTracker is a single-page application (SPA) for tracking a personal job search. Users add companies, log interviews, record rejections, and move applications through a pipeline. All views — Kanban board, list/edit, timeline, and statistics — read from a single in-memory array of company objects that is mirrored to localStorage and optionally synced to Firestore.

**Key design principles:**

- **No custom backend.** There is no server-side API. All business logic runs in the browser. Firebase provides auth and a database; Vercel provides static hosting.
- **Client-side AI.** AI requests are made directly from the browser to external provider APIs using the user's own API key, which is stored in localStorage. No key is ever sent to a server controlled by this project.
- **User-isolated data.** Firestore security rules enforce that each authenticated user can only read and write their own subcollection (`/users/{uid}/companies`). A separate `/shares/{uid}` collection allows voluntary public read-only snapshots.
- **Offline-first local cache.** Companies are always written to `localStorage` on every mutation so the app works without a network connection. Firestore is treated as a sync layer, not the source of truth for the current session.
- **Granular writes.** Each mutation (add, edit, drag-drop status change, AI note save) calls `updateCompany(uid, company)` for the single affected document rather than overwriting the entire collection. Bulk writes use a chunked `writeBatch` to stay under Firestore's 500-operation limit.

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
│  │  localStorage: companies cache, AI config, lang     │     │
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
| `src/JobTrackerApp.jsx` | Main component | All UI tabs (board, list, timeline, stats), global state, event handlers, Firestore integration, drag-and-drop, keyboard shortcuts, share mode |
| `src/firebase.js` | Module | Firebase initialization, Google Sign-In, Firestore CRUD, batch writes, share publish/load, legacy migration |
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
  → signInWithGoogle()          (Firebase popup OAuth)
  → onAuthStateChanged fires
  → loadAllCompanies(uid)
      → getDocs(/users/{uid}/companies)   [subcollection query]
      → if empty: check /users/{uid} root doc  [legacy migration]
          → if legacy data found: batchSaveCompanies(uid, companies)
      → setCompanies(data)      [React state + localStorage]
  → showToast("Drive connected")
```

The `loadAllCompanies` function handles automatic one-time migration from the old single-document format (where all companies were stored as an array field on `/users/{uid}`) to the current subcollection layout. Once migrated, the root document is not deleted but is simply ignored on subsequent sign-ins because the subcollection will be non-empty.

### 4.2 Data Mutation Flow

Every mutation follows the same pattern: update React state, write to localStorage immediately, then fire a Firestore write in the background (only when a user is signed in).

```
User action (add / edit / drag-drop / AI note save)
  → setCompanies(newState)           [React re-render]
  → useEffect [companies] fires
      → localStorage.setItem('jobTrackerAppV2Data', JSON.stringify(companies))
      → setIsSaved(false) → timer 800ms → setIsSaved(true)
  → if (user) updateCompany(uid, company)   [Firestore setDoc, fire-and-forget]

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
