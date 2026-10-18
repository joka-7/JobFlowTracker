# JobFlowTracker — Low Level Design

## 1. State Management

### App.jsx

| State / derived | Type | Purpose |
|---|---|---|
| `autoOnboarding` | `boolean` (useState, read-only) | `true` only when no mode was stored at startup (i.e., true first ever visit). Passed to `JobTrackerApp` to suppress the onboarding wizard when switching modes. |
| `mode` | `string \| null` (useState) | Current mode: `'jobseeker' \| 'recruiter' \| 'tasks' \| null`. `null` shows `ModeSelection`. |

### JobTrackerApp.jsx

All state lives in `JobTrackerApp.jsx` using React `useState`. No external state library is used.

| State variable | Type | Purpose |
|---|---|---|
| `mode` | prop on `JobTrackerApp` | `'jobseeker' \| 'recruiter'` — from `localStorage.appMode` |
| `autoOnboarding` | prop (boolean) | When `false`, suppresses the onboarding wizard even if `hasCompletedOnboarding` is unset. |
| `companies` | `Company[]` | Master array (companies or candidates). Loaded from `jobTrackerAppV2Data_{mode}`. |
| `selectedId` | `string \| null` | ID of the entity shown in the detail/edit panel. |
| `isEditing` | `boolean` | Whether the edit form is active. |
| `formData` | `Company` | Working copy of the company being edited or viewed. Initialized from `initialFormState` or from the selected company. |
| `searchText` | `string` | Live text from `SearchFilter`'s search input. Filters `filteredCompanies` via `useMemo` (matches name, role, location). |
| `filterStatuses` | `string[]` | Active status filter pills from `SearchFilter` (multi-select). Empty array = no status filter. Filters `filteredCompanies` via `useMemo`. |
| `selectedItems` | `Set<string>` | IDs (stringified) of companies checkbox-selected for bulk actions. Drives `BulkActionsBar` visibility and its bulk operations. |
| `visibleCount` | `number` | Number of companies shown in the list panel (pagination). Starts at 25; increments by 25 on "Load More". Resets to 25 when `searchText` or `filterStatuses` changes. |
| `activeTab` | `'board' \| 'list' \| 'timeline' \| 'stats'` | Which main view is rendered. |
| `user` | `{ uid, email, displayName } \| null` | Connected Google account (from `useCloudSync` / `driveSync`). `null` when Drive is not connected. |
| `syncing` | `boolean` | True while a Drive pull (`loadAllItems`) is in flight. Used to show pulsing cloud icon. |
| `isSaved` | `boolean` | Flips to `false` on every `companies` change, then back to `true` after 800 ms. Drives the header badge (Saved / Saving…). |
| `toastMessage` | `string` | Text for the ephemeral toast notification. Empty string means no toast is shown. Auto-clears after 3000 ms. |
| `showOnboarding` | `boolean` | Controls visibility of the Onboarding modal. Set to `true` on mount if `localStorage.hasCompletedOnboarding` is absent. |
| `showAISettings` | `boolean` | Controls visibility of the APIKeySettings modal. |
| `showTemplates` | `boolean` | Controls visibility of the TemplateLibrary modal. |
| `rejectionCompany` | `Company \| null` | When set, opens the RejectionAnalysis modal for the given company. |
| `dragCompanyId` | `React.ref<string \| null>` | Ref (not state) storing the ID of the card being dragged. Avoids re-renders during drag. |

### Derived values (useMemo)

| Name | Dependencies | Description |
|---|---|---|
| `filteredCompanies` | `companies`, `searchText`, `filterStatuses` | Companies matching both the search text (name/role/location, case-insensitive) and the active status filter pills (OR within the set; no filter = match all). |
| `timelineEvents` | `companies`, `i18n.language` | Flattened array of all interview and homework deadline events across all companies, sorted descending by date. |
| `stats` | `companies` | Totals: total, byStatus map, active count, response rate %, interview count. |
| `upcomingEvents` | `timelineEvents` | Subset of `timelineEvents` with dates between today and +14 days, sorted ascending. |

---

## 2. Data Schema

### Company Object

All fields are stored as-is in localStorage and in the Drive sync file.

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | `generateId()` (24 hex chars) at creation time. Key of the record's entry in the Drive sync file. |
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

See `STATUSES_RECRUITER` in `src/statuses.js` (9 statuses).

| ID | Display (EN) | Color (Tailwind) |
|---|---|---|
| `applied` | Application Received | `bg-blue-100 text-blue-800` |
| `screening` | Initial Screening | `bg-purple-100 text-purple-800` |
| `phone_screen` | Phone Screen | `bg-yellow-100 text-yellow-800` |
| `technical` | Technical Interview | `bg-orange-100 text-orange-800` |
| `final_interview` | Final Interview | `bg-indigo-100 text-indigo-800` |
| `offer_extended` | Offer Extended | `bg-teal-100 text-teal-800` |
| `offer_accepted` | Offer Accepted | `bg-green-100 text-green-800` |
| `rejected` | Rejected | `bg-red-100 text-red-800` |
| `withdrawn` | Withdrawn | `bg-stone-100 text-stone-700` |

Terminal (inactive pipeline): `rejected`, `withdrawn`, `offer_accepted`.

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

### TasksApp.jsx

| State variable | Type | Purpose |
|---|---|---|
| `tasks` | `Task[]` | Master array. Loaded from `jobTrackerAppV2Data_tasks`. |
| `selectedId` | `string \| null` | ID of the task shown in the detail panel. |
| `isEditing` | `boolean` | Whether the task edit form is active. |
| `formData` | `Task` | Working copy of the task being edited. Includes a `steps` array. |
| `newStepTitle` | `string` | Live value of the "add step" input field. |
| `searchQuery` | `string` | Filters `filteredTasks`. |
| `statusFilter` | `string` | Status dropdown filter (`'all'` or a status ID). |
| `typeFilter` | `string` | Type dropdown filter (`'all'`, `'untyped'`, or a type ID). |
| `effortTiers` | `{ smallMaxIndex, mediumMaxIndex }` | User-chosen cut-points on the effort ladder (`utils/effortScale.js`); persisted to `tasksEffortTiersV1`, not synced to Drive. |
| `reminderPrompt` | `{ taskId, name } \| null` | Snooze banner shown when a due-time reminder fires. |
| `activeTab` | `'board' \| 'list' \| 'priority' \| 'type' \| 'timeline' \| 'calendar' \| 'stats'` | Which view is rendered. |
| `user`, `syncing`, `isSaved`, `toastMessage` | — | Same pattern as `JobTrackerApp`. |

### Task Object

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string` | Yes | `Date.now().toString()` at creation. |
| `name` | `string` | Yes | Task title. |
| `description` | `string` | No | Goal or background info. |
| `status` | `'active' \| 'on_hold' \| 'completed' \| 'cancelled'` | Yes | Default: `'active'`. |
| `priority` | `'high' \| 'medium' \| 'low'` | No | Manually-set legacy priority tag. Default: `'medium'`. |
| `impact` | `'high' \| 'medium' \| 'low'` | No | Default: `'medium'`. Feeds the computed priority score (`utils/taskPriority.js`). |
| `urgency` | `'now' \| 'today' \| 'week' \| 'month' \| 'someday' \| ''` | No | Manual override; `'overdue'` is derived from `dueDate`/`dueTime`, never stored. |
| `type` | `'fix' \| 'buy' \| 'order' \| 'arrange' \| 'throw' \| 'call' \| 'email' \| 'clean' \| 'research' \| 'other' \| ''` | No | `''` = untyped. `utils/taskTypes.js`. |
| `effort` | `{ value: number \| '', unit: 'minute' \| 'hour' \| 'day' \| 'month' \| 'year' }` | No | Snapped to the nearest ladder tick on save (`utils/effortScale.js`); falls back to `duration` for scoring on legacy tasks. |
| `dueDate` | `string` | No | ISO date string (`YYYY-MM-DD`). |
| `dueTime` | `string` | No | `HH:MM`, 24h. Defaults to `09:00` for overdue/reminder calculations when unset. |
| `steps` | `Step[]` | No | Ordered array of step objects. Default: `[]`. |
| `routine` | `{ enabled, frequency: 'daily'\|'weekly'\|'monthly', interval, weekdays: number[], endDate }` | No | `utils/recurrence.js`. When `enabled` and the task is marked `completed`, `applyTaskStatusChange` advances it to its next due date instead of leaving it completed. |
| `reminder` | `{ enabled, minutesBefore, snoozedUntil }` | No | `utils/reminders.js`. `minutesBefore` ∈ `{0,15,30,60,120,1440}`. |
| `lastReminderKey` | `string` | No | De-dupes a fired reminder; cleared on snooze or routine advance. |
| `notes` | `string` | No | Free-text notes. |

### Step Object

| Field | Type | Description |
|---|---|---|
| `id` | `string` | `generateId()` (24 hex chars from Web Crypto) at creation. |
| `title` | `string` | Step description. |
| `status` | `'todo' \| 'in_progress' \| 'done' \| 'blocked'` | Default: `'todo'`. Cycled by clicking the status icon. |
| `notes` | `string` | Optional details. |
| `dueDate` | `string` | Optional ISO date. |
| `effort` | `{ value, unit }` | Same shape and snapping as the task's `effort`. |

### Task Status Values

| ID | Display (EN) | Color (Tailwind) |
|---|---|---|
| `active` | Active | `bg-blue-100 text-blue-800` |
| `on_hold` | On Hold | `bg-yellow-100 text-yellow-800` |
| `completed` | Completed | `bg-green-100 text-green-800` |
| `cancelled` | Cancelled | `bg-gray-100 text-gray-600` |

### Step Status Cycle

`todo → in_progress → done → blocked → todo`

Each status maps to a Lucide icon and background color (defined in `STEP_STATUS_CONFIG` in `TasksApp.jsx`).

### Priority Score, Routines, and Reminders

Pseudocode lives as doc comments in the utility modules themselves (`utils/taskPriority.js`,
`utils/recurrence.js`, `utils/reminders.js`) rather than being re-derived here, so there is one
place to keep in sync as the weights or windows change:

- **Priority score** (`scoreTask`) — `100 × (0.45·urgencyWeight + 0.35·impactWeight + 0.2·effortWeight)`.
  Urgency is the more urgent of a derived-from-due-date value and a manual pick; effort is
  bucketed into small/medium/large by the user's `effortTiers` cut-points. A task is a "BISE"
  (Big Impact, Small Effort) when `impact === 'high' && effortTier === 'small'`; `isDoNow` when
  urgency is `overdue`, `now`, or `today`. `groupTasksByPriority` buckets every task into exactly
  one of `doNow | bise | bigProject | fillIn | later` for the Priority view.
- **Routine advance** (`applyTaskStatusChange`) — completing a routine-enabled task doesn't leave
  it `completed`; `advanceRoutineTask` computes the next occurrence (`computeNextDueDate`,
  respecting `interval`/`weekdays`/`endDate`), resets every step to `todo`, clears
  `lastReminderKey` and any snooze, and only actually completes the task once the routine has
  passed its `endDate`. Wired into both `handleSave` (form) and `handleBoardReorder` (drag to the
  Completed column).
- **Reminder polling** — `hooks/useTaskReminders.js` keeps the notification permission in state,
  so the 30-second interval starts as soon as the user grants it (not only on the next load), and
  checks every task with `shouldNotifyTask`: due within `[minutesBefore, +5min]` of
  `dueDate`+`dueTime`, not already fired (`lastReminderKey`), and not snoozed. A fired reminder
  writes `lastReminderKey` (de-dupe) and shows the in-app snooze banner alongside the native
  `Notification`.

---

## 3. Drive Sync File

### Layout

Each device writes only its own file in the user's Drive `appDataFolder`
(`jobflowtracker-<deviceId>.json`) and reads every device's file. Drive v3 has
no conditional write, so one shared file would let two devices overwrite each
other; with one writer per file there is nothing to overwrite.

```json
{
  "version": 1,
  "device": "<deviceId>",
  "profile": { "appMode": { "value": "tasks", "at": 1760000000000 } },
  "collections": {
    "companies":  { "<id>": { "item": { "...": "..." }, "at": 1760000000000 } },
    "candidates": { "<id>": { "item": null, "at": 1760000000500 } },
    "tasks":      { "<id>": { "item": { "...": "..." }, "at": 1760000000900 } }
  }
}
```

- `item: null` is a delete tombstone, so the delete beats an older copy in another file.
- Merge (`mergeDeviceDocuments`): per record, the newest `at` wins; a tie goes to the higher device id.
- `at` is `max(now, newest stamp seen + 1)` (`nextStamp`), so a device whose clock runs behind still wins with a later edit.
- A file that is permanently unreadable (404, corrupt, newer version) is skipped; any other error fails the whole pull, so a partial merge can't re-upload stale copies.
- Idle files (no writes for 90 days) whose every entry is superseded elsewhere are deleted (`findCompactableFiles`), at most hourly.

### Write Strategies

| Operation | Function | Implementation |
|---|---|---|
| Add / edit | `updateItem(uid, mode, item)` | Queued upsert; flushed with others into one upload after 1.5 s |
| Delete | `deleteItem(uid, mode, id)` | Queued tombstone |
| Bulk / import | `batchSaveItems(uid, mode, items)` | Queued upserts, one upload |
| Load | `loadAllItems(uid, mode)` | `{ items, deletedIds }` for the mode's collection, or `null` if Drive never held one |
| Profile | `loadUserProfile` / `saveUserProfile` | `profile` map of the device file (`appMode`) |

Every write promise resolves only once the upload has landed, and only then
clears the id from the pending set (`utils/pendingSync.js`).

---

## 4. Drive Sync Module

File: `src/driveSync.js` (factory `createDriveSync`, dependencies injected for tests). Exports:

| Export | Description |
|---|---|
| `isCloudConfigured()` | `true` when `VITE_GOOGLE_CLIENT_ID` is set; otherwise Connect Drive is hidden. |
| `hasRestorableSession()` | A usable stored token exists (or, on Android, one that can be renewed silently). |
| `onAuthChange(cb)` | Calls back at once with the connected user (or `null`), then on every change of *who* is connected. Returns unsubscribe. |
| `signInWithGoogle()` | Browser: Google Identity Services token popup. Android: OS account sheet via `nativeGoogleAuth.js`. |
| `signOut()` | Drops queued writes and the session. Callers clear local data (`useCloudSync.signOutAndClear`). |
| `deleteAllSyncedData()` | Deletes every `jobflowtracker-*.json` file, revokes the grant, signs out. |
| `loadAllItems`, `updateItem`, `deleteItem`, `batchSaveItems`, `loadUserProfile`, `saveUserProfile` | See § 3. |
| `formatSignInError(err)` | User-facing message for a failed Connect Drive. |

Local bookkeeping in `localStorage`: `jobflowtracker_drive_session_v1` (token,
expiry, user), `jobflowtracker_drive_device_v1` (device id; per tab in
`sessionStorage` where Web Locks are missing), `jft_pending_sync_v1:<mode>`
(unsynced ids) and `jft_data_owner_v1` (which account the local data belongs to).

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

### Streaming — delegated to `modeldispatcher-browser-agent`

The per-provider streaming functions that used to live here (`streamGemini`, `streamOpenAICompat`, `streamOllama`, `streamAnthropic` — including the `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })` SDK call) are gone. All five providers' request/response translation, SSE/NDJSON parsing, retry, and timeout now live in [`modeldispatcher-browser-agent`](https://github.com/joka-7/ModelDispatcher/tree/main/clients/browser-agent), the shared core extracted from this file (and KanDOne/HighFive/StepByLearn, which had each independently built the same thing).

| Function | Signature | Behavior |
|---|---|---|
| `runStream(prompt, onChunk, signal)` | internal | Validates `config.provider` is known, then calls the shared package's `streamComplete(config, prompt, { onChunk, signal })`. |
| `streamChat(messages, systemPrompt, onChunk, { signal })` | exported | Multi-turn chat. Rate-limits, normalizes `messages` via `buildApiMessages` if not already an array, validates provider/key, then calls `streamComplete(config, apiMessages, { systemInstruction: systemPrompt, onChunk, signal })`. |
| `buildApiMessages(uiMessages, { appendSimBegin })` | exported | Delegates to the shared package's `buildMessages`, mapping this app's own `SIM_TRIGGER`/`appendSimBegin` (mock-interview simulation trigger) onto the shared package's generic `dropContent`/`forceTrailingFiller` options. |

`onChunk` is still called on every token with the complete text accumulated so far — that contract is unchanged, it's just the shared package producing it now.

On a failed `streamChat` call, `ChatModal` renders the shared package's `EXTERNAL_CHAT_PROVIDERS` (ChatGPT/Claude/Gemini/Groq) as direct links pre-filled with the failed message, plus a copy-to-clipboard fallback — a free escape hatch needing no API key.

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

### SearchFilter (`src/components/SearchFilter.jsx`)

**Props:** `onSearch`, `onFilterChange`, `placeholder`, `filterOptions` (`{ id, label }[]`), `mode`

**Key state:** `searchText`, `activeFilters` (string[]) — local UI state; the component is uncontrolled and reports changes upward via callbacks.

**Key behavior:**
- Search input calls `onSearch(text)` on every keystroke; parent stores it in `searchText` and uses it in `filteredCompanies`.
- Status pills toggle membership in `activeFilters` and call `onFilterChange(filters)`; parent stores it in `filterStatuses`.
- If `filterOptions` is empty, falls back to a built-in per-mode default list (`jobseeker`, `recruiter`, or generic statuses).
- A clear (X) button appears once there is any active search text or filter; resets both and notifies the parent.

### BulkActionsBar (`src/components/BulkActionsBar.jsx`)

**Props:** `selectedCount`, `onBulkDelete`, `onBulkStatusUpdate`, `onBulkExport`, `onClearSelection`, `statusOptions` (`{ id, label }[]`), `loading`

**Key state:** `showStatusMenu`, `showConfirmDelete`

**Key behavior:**
- Renders `null` when `selectedCount === 0`; otherwise shown as a sticky bar at the bottom of the list panel.
- "Change Status" opens a dropdown of `statusOptions`; picking one calls `onBulkStatusUpdate(statusId)` (only rendered when `statusOptions.length > 0`).
- "Export" calls `onBulkExport()` directly (no confirmation).
- "Delete" opens an in-component confirm modal ("Delete N items? This action cannot be undone"); confirming calls `onBulkDelete()`.
- "Clear" calls `onClearSelection()`.
- In `JobTrackerApp`, the wired handlers are: `handleBulkStatusUpdate` (maps status across selected IDs and calls `batchSaveItems`), `handleBulkExport` (downloads a JSON file of just the selected items), `handleBulkDelete` (filters selected IDs out of `companies`, calls `deleteItem` per ID, clears the detail panel if the open item was deleted), `clearSelection` (resets the `selectedItems` Set).

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

**Reset:** A `useEffect` with `[searchText, filterStatuses]` as dependencies resets `visibleCount` to 25 whenever the filter changes, ensuring the user does not see a "ghost" high page count after narrowing results.

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
- `modeldispatcher-browser-agent`, `modeldispatcher-react-ui` (shared multi-provider AI client and settings UI — see §5)
- `@capacitor/core` (platform check; the Android plugin `@capgo/capacitor-social-login` is loaded only inside the app)
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

`VITE_GOOGLE_CLIENT_ID` (optional) enables Drive sync; see [`.env.example`](../.env.example). It is a public OAuth client ID, not a secret. AI API keys are entered by the user at runtime and stored only in their browser's `localStorage`.

### Testing

| Suite | Command | Count | Scope |
|-------|---------|-------|-------|
| Unit + integration | `npm test` | — | `src/__tests__/` — jsdom; Drive, Google sign-in and the Android plugin are faked |
| E2E | `npm run test:e2e` | 12 | `e2e/` — Playwright, real browser, port 5199 |
| All | `npm run test:all` | 167 | Both |

Vitest excludes `e2e/` via `vite.config.js`. E2E starts Vite with `--strictPort 5199` to avoid port conflicts.

---

## Android app

The same web build runs inside a Capacitor shell (`capacitor.config.json`:
`io.github.joka7.jobflowtracker`, `webDir: dist`; native project in `android/`).

- **Sign-in:** Google refuses OAuth inside a WebView, so `nativeGoogleAuth.js` asks Android for the `drive.appdata` token through `@capgo/capacitor-social-login` (online mode) and renews it silently, 5 s before expiry, on the next Drive call. `MainActivity.java` forwards Google's consent result to the plugin; without it there is no Drive scope.
- **No service worker, no Install button** inside the app (`pwaUpdate.js`, `usePwaInstall.js`): the bundled files are the app, and a worker would keep serving the previous build after an update.
- **`android:allowBackup="false"`:** Android's cloud backup would otherwise copy local data and the Drive token off the device.
- **Icons and splash:** `python3 scripts/generate-icons.py` (same master image as the web icons).

### Build and release (`.github/workflows/android.yml`)

Every PR builds a signed APK as a workflow artifact; every push to `main`
publishes it as release `android-1.0.<run>`, so the latest is always at
`releases/latest/download/JobFlowTracker.apk`. `versionCode` is the run number,
so each APK installs over the last.

Required repository settings:

| Name | Kind | Value |
|---|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Actions **variable** | The OAuth *Web* client ID (Google matches it to the Android client) |
| `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_B64_2` | Actions secrets | The release keystore, base64, split in two (some clipboards cut lines at 2000 characters) |
| `ANDROID_KEY_PASSWORD` | Actions secret | Keystore and key password; key alias `jobflowtracker` |

The Android OAuth client in Google Cloud must list package
`io.github.joka7.jobflowtracker` and the signing key's SHA-1. The workflow never
falls back to a temporary key: a missing or wrong secret fails the job.

