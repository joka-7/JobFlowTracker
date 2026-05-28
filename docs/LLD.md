# Low Level Design — JobFlowTracker

## State Management

All state lives in `JobTrackerApp.jsx` using React `useState`. No external state library.

| State | Type | Purpose |
|---|---|---|
| `companies` | `Company[]` | All job applications |
| `selectedId` | `string\|null` | Currently selected company |
| `isEditing` | `boolean` | Edit form open |
| `formData` | `Company` | Current form values |
| `searchQuery` | `string` | Search filter |
| `statusFilter` | `string` | Status dropdown filter |
| `activeTab` | `'board'\|'list'\|'timeline'` | Active view |
| `user` | `FirebaseUser\|null` | Signed-in user |
| `syncing` | `boolean` | Firestore write in progress |
| `isSaved` | `boolean` | localStorage write indicator |

---

## Data Schema

### Company object
```typescript
{
  id: string              // Date.now() timestamp string
  name: string            // Company name (required)
  role: string            // Job title
  status: StatusId        // See status list below
  priority: 'high'|'medium'|'low'
  location: string
  website: string         // URL
  linkedinCompany: string // URL
  linkedinHR: string      // URL
  description: string     // What the company does
  products: string
  generalNotes: string
  interviews: Interview[]
  homeworks: Homework[]
  contacts: Contact[]
}
```

### Interview object
```typescript
{
  type: string     // One of INTERVIEW_TYPE_KEYS
  date: string     // ISO date string YYYY-MM-DD
  interviewer: string
  summary: string
}
```

### Status IDs
```
applied | hr_call | tech_interview | manager_interview |
home_assignment | references | offer | frozen | rejected |
ghosted | withdrawn
```

---

## Firestore Structure

```
/users
  /{uid}                        ← one document per user
    companies: Company[]        ← full array, replaced on save
    updatedAt: string           ← ISO timestamp
```

**Write strategy:** full document replace on every save (not partial updates). Simple and safe for this data size.

**Save trigger:** debounced 3 seconds after any change to `companies` array, only when user is signed in.

---

## i18n Structure

Configured in `src/i18n.js` using `react-i18next`.

- Language stored in `localStorage` key `appLanguage`
- Defaults to `'en'` on first visit
- Toggle switches between `'en'` and `'he'`
- RTL layout applied via `dir` attribute on root `<div>` when `i18n.language === 'he'`

Translation key namespaces:
```
status.*         → status labels
priority.*       → priority labels
interviewType.*  → interview type labels (English key → translated label)
header.*         → top bar text
tabs.*           → tab labels
board.*          → kanban board text
timeline.*       → timeline text
list.*           → sidebar list text
form.*           → edit form labels/placeholders
detail.*         → company detail view
toast.*          → toast notification messages
alert.*          → alert/confirm dialog messages
```

---

## RTL Handling

When Hebrew is active, the following changes apply:

| Element | LTR | RTL |
|---|---|---|
| Root div | `dir="ltr"` | `dir="rtl"` |
| Header gradient | `from-blue-700 to-indigo-800` | `from-indigo-800 to-blue-700` |
| Sidebar border | `border-r` | `border-l` |
| Search icon | `left-3` | `right-3` |
| Timeline bar | `border-l-2 pl-6` | `border-r-2 pr-6` |
| Timeline dot | `-left-[31px]` | `-right-[31px]` |
| Back button | `ArrowLeft` | `ArrowRight` |
| Delete button | `right-4` | `left-4` |

---

## Firebase Module (`firebase.js`)

| Function | Description |
|---|---|
| `signInWithGoogle()` | Opens Google OAuth popup, returns user |
| `signOut()` | Signs out current user |
| `onAuthChange(cb)` | Subscribes to auth state changes, returns unsubscribe fn |
| `loadUserData(uid)` | Reads `users/{uid}` from Firestore, returns `companies[]` or `null` |
| `saveUserData(uid, companies)` | Writes full `companies[]` to `users/{uid}` |

---

## Logger Module (`logger.js`)

Thin wrapper around `console.*` — only logs in development (`import.meta.env.DEV`).

```javascript
logger.info('auth.signIn', { uid: user.uid })
logger.warn('data.import', { reason: 'empty file' })
logger.error('firestore.save', { error: e.message })
```

---

## Build & Deploy Pipeline

```
Local change
  → git push origin main
  → Vercel webhook triggered
  → npm run build (Vite)
  → Static files deployed to CDN
  → https://job-flow-tracker-ten.vercel.app updated
```

Build output: `dist/` — ~623KB JS (191KB gzipped), ~23KB CSS.
