# JobFlowTracker — Low Level Design

## 1. State Management

All state lives in `JobTrackerApp.jsx` using React `useState`. No external state library is used.

| State variable | Type | Purpose |
|---|---|---|
| `mode` | prop on `JobTrackerApp` | `'jobseeker' \| 'recruiter'` — fixed for session, from `localStorage.appMode` |
| `companies` | `Company[]` | Master array (companies or candidates). Loaded from `jobTrackerAppV2Data_{mode}`. |
| `selectedId` | `string \| null` | ID of the entity shown in the detail/edit panel. |
| `isEditing` | `boolean` | Whether the edit form is active. |
| `formData` | `Company` | Working copy of the company being edited or viewed. Initialized from `initialFormState` or from the selected company. |
| `searchQuery` | `string` | Live text in the list search field. Filters `filteredCompanies` via `useMemo`. |
| `statusFilter` | `string` | Selected status dropdown value (`'all'` or a status ID). Filters `filteredCompanies` via `useMemo`. |
| `visibleCount` | `number` | Number of companies shown in the list panel (pagination). Starts at 25; increments by 25 on "Load More". Resets to 25 when `searchQuery` or `statusFilter` changes. |
| `activeTab` | `'board' \| 'list' \| 'timeline' \| 'stats'` | Which main view is rendered. |
| `user` | `FirebaseUser \| null` | Currently authenticated Firebase user. `null` when signed out. |
| `syncing` | `boolean` | True while `loadAllCompanies` is in flight after sign-in. Used to show pulsing cloud icon. |
| `isSaved` | `boolean` | Flips to `false` on every `companies` change, then back to `true` after 800 ms. Drives the header badge (Saved / Saving…). |
| `toastMessage` | `string` | Text for the ephemeral toast notification. Empty string means no toast is shown. Auto-clears after 3000 ms. |
| `showOnboarding` | `boolean` | Controls visibility of the Onboarding modal. Set to `true` on mount if `localStorage.hasCompletedOnboarding` is absent. |
| `showAISettings` | `boolean` | Controls visibility of the APIKeySettings modal. |
| `showTemplates` | `boolean` | Controls visibility of the TemplateLibrary modal. |
| `rejectionCompany` | `Company \| null` | When set, opens the RejectionAnalysis modal for the given company. |
| `shareMode` | `boolean` | True when viewing via `?share=uid`. Hides all edit controls and shows the amber read-only banner. |
| `shareCopied` | `boolean` | True for 3 seconds after the share URL is copied to clipboard. Drives the share button icon (link → checkmark). |
| `dragCompanyId` | `React.ref<string \| null>` | Ref (not state) storing the ID of the card being dragged. Avoids re-renders during drag. |

### Derived values (useMemo)

| Name | Dependencies | Description |
|---|---|---|
| `filteredCompanies` | `companies`, `searchQuery`, `statusFilter` | Companies matching both the search text and status filter. |
| `timelineEvents` | `companies`, `i18n.language` | Flattened array of all interview and homework deadline events across all companies, sorted descending by date. |
| `stats` | `companies` | Totals: total, byStatus map, active count, response rate %, interview count. |
| `upcomingEvents` | `timelineEvents` | Subset of `timelineEvents` with dates between today and +14 days, sorted ascending. |

---

## 2. Data Schema

### Company Object

All fields are stored as-is in Firestore and in localStorage.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | `Date.now().toString()` at creation time. Used as Firestore document ID. |
| `name` | `string` | Yes | Company name. |
| `role` | `string` | No | Job title / position applied for. |
| `location` | `string` | No | Job location (city, remote, etc.). |
| `status` | `string` | Yes | One of the 11 status IDs (see below). Default: `'applied'`. |
| `priority` | `'high' \| 'medium' \| 'low'` | No | Default: `'medium'`. |
| `website` | `string` | No | Company website URL. |
| `linkedinCompany` | `string` | No | Company LinkedIn URL. |
| `linkedinHR` | `string` | No | HR contact LinkedIn URL. |
| `description` | `string` | No | Free-text company description. |
| `products` | `string` | No | Company products or services. |
| `linkedinCandidate` | `string` | No | Recruiter: candidate LinkedIn URL. |
| `currentRole` | `string` | No | Recruiter: candidate's current job title. |
| `expectedSalary` | `string` | No | Recruiter: salary expectations. |
| `source` | `string` | No | Recruiter: where the candidate came from. |
| `interviews` | `Interview[]` | No | Array of interview records. Default: `[]`. |
| `homeworks` | `Homework[]` | No | Array of home assignment records. Default: `[]`. |
| `contacts` | `Contact[]` | No | Array of contact records. Default: `[]`. |
| `generalNotes` | `string` | No | Free-text personal notes. AI-generated notes are appended here separated by `\n\n---\n`. |
| `rejection` | `RejectionDetails` | No | Always present as `{ date: '', method: '', notes: '' }` when status is not rejected; populated when status is `'rejected'` or `'ghosted'`. |

### Interview Object

| Field | Type | Description |
|---|---|---|
| `type` | `string` | One of the 8 interview type keys (see below). |
| `date` | `string` | ISO date string (`YYYY-MM-DD`). |
| `interviewer` | `string` | Interviewer name (free text, never sent to AI). |
| `summary` | `string` | User's notes from the interview. |

### Rejection Object

| Field | Type | Description |
|---|---|---|
| `date` | `string` | ISO date string of the rejection. |
| `method` | `string` | One of the 6 rejection method keys (see below). |
| `notes` | `string` | Free-text notes or feedback received. |

### Status IDs — Job seeker

See `STATUSES_JOBSEEKER` in `src/statuses.js` (11 statuses).

### Status IDs — Recruiter

See `STATUSES_RECRUITER` in `src/statuses.js` (9 statuses). Documented in [RECRUITER_MODE.md](RECRUITER_MODE.md).

### Status IDs (legacy table — job seeker)

| ID | Display (EN) | Color (Tailwind) |
|---|---|---|
| `applied` | Applied | `bg-blue-100 text-blue-800` |
| `hr_call` | HR Call | `bg-purple-100 text-purple-800` |
| `tech_interview` | Technical Interview | `bg-yellow-100 text-yellow-800` |
| `manager_interview` | Manager Interview | `bg-orange-100 text-orange-800` |
| `home_assignment` | Home Assignment | `bg-indigo-100 text-indigo-800` |
| `references` | References Check | `bg-teal-100 text-teal-800` |
| `offer` | Offer | `bg-green-100 text-green-800` |
| `frozen` | Frozen | `bg-gray-100 text-gray-800` |
| `rejected` | Rejected | `bg-red-100 text-red-800` |
| `ghosted` | Ghosted | `bg-slate-100 text-slate-600` |
| `withdrawn` | Withdrawn | `bg-stone-100 text-stone-700` |

### Interview Type Keys

`'Intro Call / HR'`, `'Technical Interview'`, `'Manager Interview'`, `'Home Assignment / Task'`, `'VP / CEO Interview'`, `'References Check'`, `'Salary Offer'`, `'Other'`

### Rejection Method Keys

`'Automatic Email'`, `'Personal Email'`, `'Phone Call'`, `'No Response'`, `'During Interview'`, `'Other'`

---

## 3. Firestore Structure

### Collection Layout

```
/users/{uid}                              — user profile (appMode, etc.)
/users/{uid}/companies/{companyId}        — job seeker entities
/users/{uid}/candidates/{candidateId}     — recruiter entities
```

The `companyId` in the subcollection path is `String(company.id)`, which is a numeric timestamp string (e.g., `"1717600000000"`).

### Write Strategies

| Add / edit | `updateItem(uid, mode, item)` | `setDoc` on companies or candidates subcollection |
| Delete | `deleteItem(uid, mode, id)` | `deleteDoc` |
| JSON import | `batchSaveItems(uid, mode, items)` | Chunked `writeBatch` (490/batch) |
| Load | `loadAllItems(uid, mode)` | Subcollection query; jobseeker legacy migration |
| Profile | `loadUserProfile` / `saveUserProfile` | Root doc `users/{uid}` for `appMode` |

### Legacy Migration

`loadAllCompanies(uid)` first queries the `/users/{uid}/companies` subcollection. If the subcollection returns documents, they are used directly. If it is empty, the function reads the root `/users/{uid}` document and checks for a `companies` array field (legacy format). If found, it immediately calls `batchSaveCompanies` to migrate to the subcollection format. The root document is not deleted (allows rollback if needed) but will be ignored on all subsequent sign-ins.

---

## 4. Firebase Module

File: `src/firebase.js`

| Export | Signature | Description |
|---|---|---|
| `auth` | `Auth` | Firebase Auth instance (exported for direct use if needed). |
| `db` | `Firestore` | Firestore instance. |
| `signInWithGoogle()` | `() => Promise<User>` | Opens Google OAuth popup. Returns the signed-in user. |
| `signOut()` | `() => Promise<void>` | Signs out the current user. |
| `onAuthChange(callback)` | `(callback: (user) => void) => Unsubscribe` | Subscribes to auth state changes. Returns the unsubscribe function. Used in a `useEffect` in `JobTrackerApp`. |
| `loadAllCompanies(uid)` | `(uid: string) => Promise<Company[] \| null>` | Reads the subcollection. Falls back to legacy migration if subcollection is empty. Returns `null` if no data anywhere. |
| `updateCompany(uid, company)` | `(uid: string, company: Company) => Promise<void>` | `setDoc` on `/users/{uid}/companies/{company.id}`. Creates or fully overwrites. |
| `deleteFirestoreCompany(uid, id)` | `(uid: string, id: string) => Promise<void>` | `deleteDoc` on a single company document. |
| `batchSaveCompanies(uid, companies)` | `(uid: string, companies: Company[]) => Promise<void>` | Writes all companies in chunks of 490 using `writeBatch`. Used for JSON import and legacy migration. |
| `publishShare(uid, companies)` | `(uid: string, companies: Company[]) => Promise<void>` | `setDoc` on `/shares/{uid}` with `{ companies, sharedAt: ISO string }`. |
| `loadSharedData(uid)` | `(uid: string) => Promise<{ companies, sharedAt } \| null>` | `getDoc` on `/shares/{uid}`. No auth required (public read). Returns `null` if not found. |
| `loadUserData(uid)` | `(uid: string) => Promise<Company[] \| null>` | Legacy alias for `loadAllCompanies`. |
| `saveUserData(uid, companies)` | `(uid: string, companies: Company[]) => Promise<void>` | Legacy alias for `batchSaveCompanies`. |

---

## 5. AI Service Module

File: `src/services/aiAssistant.js`

### PROVIDERS Object

```js
PROVIDERS = {
  gemini:    { id, name, free: false, defaultModel: 'gemini-2.0-flash',           placeholder, infoUrl, infoText },
  groq:      { id, name, free: true,  defaultModel: 'llama-3.1-8b-instant',       placeholder, infoUrl, infoText },
  ollama:    { id, name, free: true,  noKey: true, defaultModel: 'llama3.2',      placeholder, infoUrl, infoText },
  anthropic: { id, name, free: false, defaultModel: 'claude-haiku-4-5-20251001',  placeholder, infoUrl, infoText },
  openai:    { id, name, free: false, defaultModel: 'gpt-4o-mini',                placeholder, infoUrl, infoText },
}
```

`noKey: true` on `ollama` tells `APIKeySettings` to show a URL field instead of an API key field.

### Module-level Config

```js
let config = {
  provider: 'gemini',
  apiKey: '',
  model: '',
  ollamaUrl: 'http://localhost:11434',
};
```

### Exported Configuration Functions

| Function | Signature | Behavior |
|---|---|---|
| `initAI` | `(provider, apiKey, model, ollamaUrl) => void` | Overwrites `config`. Called on mount (from localStorage) and on save in `APIKeySettings`. |
| `isAIReady` | `() => boolean` | Returns `true` if `config.provider === 'ollama'` OR `config.apiKey` is non-empty. |
| `getCurrentProvider` | `() => string` | Returns `config.provider`. |

### Internal Streaming Functions

| Function | Provider | Protocol | Notes |
|---|---|---|---|
| `streamGemini(apiKey, model, prompt, onChunk)` | Gemini | SSE | Single-turn. URL includes `?alt=sse&key={apiKey}`. Parses `candidates[0].content.parts[0].text`. |
| `streamOpenAICompat(url, apiKey, body, onChunk)` | OpenAI, Groq | SSE | Generic for both providers. Sends `{ ...body, stream: true }`. Parses `choices[0].delta.content`. Terminates on `[DONE]` line. |
| `streamOllama(baseUrl, model, prompt, onChunk)` | Ollama | Newline-delimited JSON | Single-turn. POST to `{baseUrl}/api/generate`. Each line: `JSON.parse(line).response`. |
| `streamAnthropic(apiKey, model, prompt, onChunk)` | Anthropic | SDK async iterator | Uses `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })`. `max_tokens: 600`. Iterates `content_block_delta` events. |
| `runStream(prompt, onChunk)` | All | — | Internal dispatcher. Reads `config.provider`, calls the correct streaming function. |

All streaming functions accumulate a `full` string. `onChunk(full)` is called on every token with the complete text received so far.

### Exported AI Task Functions

| Function | Signature | Prompt Strategy | Privacy |
|---|---|---|---|
| `getInterviewPrep` | `(company, interviewType, language, onChunk)` | System: job search coach. Includes `company.name`, `company.role`, `company.location`, interview count. Requests 3 tips with bold titles. | No interviewer names. No personal info. |
| `analyzeRejection` | `(company, language, onChunk)` | System: supportive coach. Includes `company.name`, `company.role`, rejection method, number of interviews, interview types (not names). Requests 3 suggestions + 1 encouraging sentence. | No interviewer names. Uses only typed rejection method values. |
| `analyzePatterns` | `(companies, language, onChunk)` | System: job search strategist. Aggregates: total count, rejected/ghosted count, active count, total interviews. Sends a sample of up to 20 companies as `{ name, status, interviews count, rejectionMethod }`. | Only company names and statuses — no interviewer names, no personal notes. |
| `getSchedulingAdvice` | `(company, language, onChunk)` | System: interview prep coach. Sends `company.name`, `company.role`, and upcoming interview dates with days-until computed server-side. Requests day-by-day prep plan. | No interviewer names. Explicitly states "Do not include any personal data beyond what is listed." |
| `getResumeAdvice` | `(company, resumeText, language, onChunk)` | System: application coach. Includes `company.name`, `company.role`, `company.location`, and up to 3000 chars of resume text. Requests 3 experience highlights with relevance and tip. | Resume text truncated to 3000 chars. UI warns user not to include name/email/phone. |
| `debriefInterview` | `(notes, context, language, onChunk)` | System: expert interview coach. Sends notes verbatim (user-pasted) plus an optional context string. Requests structured 4-section debrief. | UI warns user not to include personal names. |
| `streamChat` | `(messages, systemPrompt, onChunk)` | Multi-turn. Sends full message array. System prompt includes `company.name`, `company.role`, `company.location`, status, interview count when a company is selected. | UI warns user not to include personal names. |

### Language Support in Prompts

A `LANG` map appends a language instruction to every prompt:
```js
const LANG = { en: 'Respond in English.', he: 'ענה בעברית.', fr: 'Réponds en français.' }
```
The `language` parameter comes from `i18n.language` in `JobTrackerApp`.

---

## 6. Components

### AIAssistant (`src/components/AIAssistant.jsx`)

**Props:** `company` (selected Company or null), `companies` (all), `language`, `t`, `onOpenSettings`, `onSaveToCompany`

**Key state:** `isOpen`, `screen` (`'menu' | 'debrief'`), `chatOpen`, `resumeOpen`, `activeMode`, `streamText`, `loading`, `error`, `resultSaved`

**Key behavior:**
- Fixed position bottom-right, z-index 40.
- Sparkles button toggles `isOpen`. When open, shows a 320px panel.
- Menu screen has 6 action buttons: interview prep (requires `company`), debrief (switches `screen`), open chat (opens ChatModal), tailor resume (opens ResumeReview, requires `company`), analyze patterns (requires `companies.length > 0`), scheduling advice (requires company with a future interview date).
- Buttons call `isAIReady()`; if not ready they invoke `onOpenSettings()` instead.
- `streamText` is updated via `onChunk` callbacks and rendered by `StreamingText` with a pulsing cursor while `loading`.
- "Save to notes" button appears after streaming completes; calls `onSaveToCompany(company.id, streamText)`.

### APIKeySettings (`src/components/APIKeySettings.jsx`)

**Props:** `t`, `onClose`

**Key state:** `provider`, `apiKey`, `model`, `ollamaUrl`, `visible` (key show/hide), `done`

**Key behavior:**
- Reads current config from localStorage on mount.
- Renders provider selector as a vertical list of radio-style buttons. Groq and Ollama show a "FREE" badge.
- For Ollama: shows URL input instead of API key input.
- Model field is optional; falls back to `PROVIDERS[provider].defaultModel` on save.
- `handleSave` calls `initAI()` and sets a 900 ms success state before closing.
- `handleClear` removes all AI keys from localStorage and reloads the page.

### ChatModal (`src/components/ChatModal.jsx`)

**Props:** `company`, `language`, `t`, `onClose`, `onOpenSettings`, `onSaveToCompany`

**Key state:** `messages` (array of `{ role, content, streaming }`), `input`, `loading`, `error`

**Key behavior:**
- Full-screen modal on mobile, centered card on desktop (600px max height).
- System prompt is constructed from `company` fields if a company is selected.
- `send()` appends user message, adds a placeholder assistant message, calls `streamChat`, updates the last message in-place via `setMessages` on each chunk.
- `streaming: true` flag on the last assistant message renders the pulsing cursor.
- Each assistant message has a "Save to notes" inline button that calls `onSaveToCompany`.
- Enter sends; Shift+Enter inserts newline. Textarea auto-grows.

### RejectionAnalysis (`src/components/RejectionAnalysis.jsx`)

**Props:** `company`, `language`, `t`, `onClose`, `onOpenSettings`, `onSave`

**Key state:** `streamText`, `loading`, `error`

**Key behavior:**
- Auto-runs `analyzeRejection` on mount.
- Shows rejection details (method, interview count) above the streaming result.
- "Save to notes" button calls `onSave(streamText)`.

### ResumeReview (`src/components/ResumeReview.jsx`)

**Props:** `company`, `language`, `t`, `onClose`, `onOpenSettings`, `onSave`

**Key state:** `resumeText`, `result`, `loading`, `error`, `saved`

**Key behavior:**
- Textarea capped at 3000 chars with a character counter.
- Privacy warning displayed at the top.
- "Get tailoring suggestions" calls `getResumeAdvice`.
- Result rendered with `MarkdownText` (bold support via `**text**`).
- "Save to notes" inline button after result.

### TemplateLibrary (`src/components/TemplateLibrary.jsx`)

**Props:** `t`, `onClose`

**Key state:** `activeCategory` (default: first key), `searchQuery`

**Key behavior:**
- 6 categories: `hr`, `technical`, `behavioral`, `manager`, `culture`, `questions_to_ask`.
- When no search: sidebar shows category pills; right panel shows questions for active category with count.
- When searching: sidebar hidden; results show questions matching query across all categories, with a category badge.
- Each question card has a `CopyButton` (clipboard API, 1800 ms "Copied!" state).

### Onboarding (`src/components/Onboarding.jsx`)

**Props:** `t`, `i18n`, `isRTL`, `onClose`, `openNewForm`, `triggerFileInput`, `openAISettings`

**Key state:** `step` (0–4)

**Key behavior:**
- 5 steps: welcome, board, list, ai, shortcuts.
- Step indicator dots at top; active dot is wider.
- Language picker (EN/HE/FR) in the header changes `i18n` language live.
- Back/Next arrows flip direction in RTL (use `ChevronLeft`/`ChevronRight` swapped).
- Last step shows "Let's go!" button.
- Closing (X or "Let's go!") sets `localStorage.hasCompletedOnboarding = '1'`.

### Tooltip (`src/components/Tooltip.jsx`)

**Props:** `text`, `position` (`'top' | 'bottom'`), `children`

**Key behavior:** Wraps children in a `div` with Tailwind `group` class. Tooltip text is shown on `group-hover` using `opacity-0 group-hover:opacity-100` transition.

---

## 7. i18n Structure

File: `src/i18n.js`. Uses `react-i18next` with `i18next`.

### Languages

| Code | Language | Direction |
|---|---|---|
| `en` | English | LTR |
| `he` | Hebrew | RTL |
| `fr` | French | LTR |

Language is persisted to `localStorage` as `appLanguage`. The app root sets `dir={isRTL ? 'rtl' : 'ltr'}` on the outermost `div`. `isRTL` is derived from `i18n.language === 'he'` in `JobTrackerApp`.

### Translation Namespaces (all keys in `en.json` / `he.json` / `fr.json`)

| Namespace key | Contents |
|---|---|
| `status.*` | 11 status display names (applied, hr_call, ..., withdrawn, unknown) |
| `priority.*` | high, medium, low |
| `interviewType.*` | 8 interview type display names |
| `header.*` | Title, subtitle, button labels, tooltip texts, save/sync indicators |
| `tabs.*` | board, list, timeline, stats tab labels |
| `board.*` | Empty state texts, CTA button labels, mode descriptions |
| `timeline.*` | Timeline title, empty state, event type labels |
| `list.*` | Search placeholder, filter label, no-results, Load More, remaining |
| `form.*` | All form field labels, placeholders, save/cancel, rejection sub-fields |
| `rejectionMethod.*` | 6 rejection method display names |
| `detail.*` | Company detail panel labels (edit, delete, about, notes, etc.) |
| `stats.*` | Statistics labels, funnel title/subtitle, avg days, no-data |
| `toast.*` | All transient notification messages |
| `alert.*` | `confirm` / `alert()` dialog strings |
| `onboarding.*` | All 5 step titles, subtitles, body text, and CTA labels |
| `ai.*` | AI panel button labels, states, error prompts |
| `resume.*` | Resume review modal labels and placeholder |
| `chat.*` | Chat modal labels, placeholder, save-to-notes |
| `settings.*` | APIKeySettings modal labels, provider label, save/clear |
| `rejection.*` | RejectionAnalysis modal labels |
| `tooltips.*` | Tooltip text for interviewType, rejectionMethod, responseRate, priority |
| `templates.*` | TemplateLibrary title, search, copy/copied, footer, category names |

---

## 8. RTL Handling

When `i18n.language === 'he'`, the app root sets `dir="rtl"`. Most layout reversal is handled automatically by the browser's RTL rendering. Some Tailwind classes require explicit RTL overrides using conditional expressions.

| Element | LTR class | RTL class |
|---|---|---|
| Search icon position (list panel) | `left-3` | `right-3` |
| Search input padding | `pl-10 pr-4` | `pr-10 pl-4` |
| Filter icon position | `left-3` | `right-3` |
| Filter input padding | `pl-10 pr-4` | `pr-10 pl-4` |
| Interview delete button position | `right-4` | `left-4` |
| Interview content indentation | `pl-6` | `pr-6` |
| Timeline vertical bar | `border-l-2 pl-6` | `border-r-2 pr-6` |
| Timeline dot position | `-left-[31px]` | `-right-[31px]` |
| Company detail side border | `border-r` | `border-l` |
| Header gradient direction | `from-blue-700 to-indigo-800` | `from-indigo-800 to-blue-700` |
| Back arrow icon | `ArrowLeft` | `ArrowRight` |
| Onboarding Back chevron | `ChevronLeft` | `ChevronRight` |
| Onboarding Next chevron | `ChevronRight` | `ChevronLeft` |

---

## 9. Pagination

The list panel uses a simple count-based pagination pattern.

**State:** `visibleCount` (number, initialized to 25)

**Rendering:**
```js
filteredCompanies.slice(0, visibleCount).map(company => ...)
```

**Load More button:** Shown only when `visibleCount < filteredCompanies.length`.
```js
onClick={() => setVisibleCount(n => n + 25)}
```
The button label shows the remaining count: `"Load more (N remaining)"`.

**Reset:** A `useEffect` with `[searchQuery, statusFilter]` as dependencies resets `visibleCount` to 25 whenever the filter changes, ensuring the user does not see a "ghost" high page count after narrowing results.

---

## 10. Build and Deploy

### Build

```
npm run build
→ vite build
→ Output: dist/
    ├── index.html
    ├── assets/index-[hash].js    (bundled JS + React + all dependencies)
    └── assets/index-[hash].css   (Tailwind CSS, purged)
```

**Key dependencies bundled:**
- `react` 19.x, `react-dom`
- `@anthropic-ai/sdk` (Anthropic SDK, browser-compatible with `dangerouslyAllowBrowser`)
- `firebase` 12.x (modular SDK — only `auth` and `firestore` modules imported)
- `i18next`, `react-i18next`
- `lucide-react` (icon components, tree-shaken)

**Dev dependencies (not in bundle):** `tailwindcss`, `vite`, `eslint`, `vitest`, `@testing-library/*`

### Vercel Deploy Flow

```
git push origin main
  → Vercel webhook triggers
  → Install: npm install
  → Build:   npm run build  (vite build)
  → Output:  dist/
  → Deploy to CDN
  → All unmatched routes → index.html  (SPA fallback)
```

No environment variables are required at build time. The Firebase project config embedded in `src/firebase.js` is intentionally public (Firebase project config is not a secret; Firestore security rules enforce access control). AI API keys are entered by the user at runtime and stored only in their browser's `localStorage`.

### Testing

| Suite | Command | Count | Scope |
|-------|---------|-------|-------|
| Unit + integration | `npm test` | 155 | `src/__tests__/` — jsdom, mocked Firebase |
| E2E | `npm run test:e2e` | 12 | `e2e/` — Playwright, real browser, port 5199 |
| All | `npm run test:all` | 167 | Both |

Vitest excludes `e2e/` via `vite.config.js`. E2E starts Vite with `--strictPort 5199` to avoid port conflicts.
