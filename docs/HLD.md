# High Level Design — JobFlowTracker

## Overview

JobFlowTracker is a single-page web application for tracking job applications. It runs entirely in the browser with no custom backend. Data persistence and authentication are delegated to Firebase.

---

## Architecture

```
┌─────────────────────────────────────────┐
│              User's Browser             │
│                                         │
│  ┌───────────────────────────────────┐  │
│  │     React App (Vite build)        │  │
│  │  - UI components                  │  │
│  │  - State management (useState)    │  │
│  │  - i18n (EN / HE)                 │  │
│  │  - localStorage (offline cache)   │  │
│  └──────────────┬────────────────────┘  │
└─────────────────┼───────────────────────┘
                  │ HTTPS
        ┌─────────┴──────────┐
        │                    │
┌───────▼───────┐   ┌────────▼────────┐
│   Firebase    │   │     Vercel      │
│ Authentication│   │  Static Hosting │
│  (Google SSO) │   │  (CDN delivery) │
└───────┬───────┘   └─────────────────┘
        │
┌───────▼───────┐
│   Firestore   │
│   Database    │
│ users/{uid}/  │
│  companies[]  │
└───────────────┘
```

---

## Components

| Component | Responsibility |
|---|---|
| `JobTrackerApp.jsx` | All UI, state, user interactions |
| `firebase.js` | Auth (sign in/out), Firestore read/write |
| `i18n.js` | Language configuration |
| `logger.js` | Structured logging |
| `locales/en.json` | English strings |
| `locales/he.json` | Hebrew strings |

---

## Data Flow

### Sign In
```
User clicks "Sign in" 
  → Firebase Auth popup (Google)
  → onAuthStateChanged fires
  → loadUserData(uid) from Firestore
  → setCompanies(data)
  → UI updates
```

### Data Change
```
User edits/adds/deletes company
  → setCompanies() (instant UI update)
  → localStorage.setItem() (offline cache)
  → 3s debounce timer starts
  → saveUserData(uid, companies) to Firestore
  → setSyncing(false)
```

### Sign Out
```
User clicks sign out
  → Firebase signOut()
  → setUser(null)
  → data stays in localStorage (offline access)
```

---

## Security Model

- Each Firestore document is at `users/{uid}` — keyed by Firebase UID
- Firestore rules enforce: only the authenticated user matching the UID can read/write their document
- No server-side code — attack surface is limited to client + Firebase rules
- Google handles all authentication — no passwords stored

---

## Deployment

- Code is hosted on **Vercel** (static CDN, auto-deploys on push to `main`)
- Firebase project: `jobflowtracker-7733e`
- Auth domain: `jobflowtracker-7733e.firebaseapp.com`
- Live URL: `https://job-flow-tracker-ten.vercel.app`
