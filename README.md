# JobFlowTracker

A personal job application tracker with Google Sign-In, cross-device sync via Firebase, Hebrew/English support, and offline JSON backup.

**Live app:** https://job-flow-tracker-ten.vercel.app

---

## Features

- **Kanban board** — visualize applications by status
- **List & edit** — detailed view with interview history, notes, contacts
- **Timeline** — chronological activity history
- **Google Sign-In** — each user has private, isolated data
- **Cross-device sync** — data saved to Firestore, accessible anywhere
- **Hebrew / English** — full RTL/LTR language toggle, persists across sessions
- **Offline backup** — export/import JSON at any time

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite |
| Styling | Tailwind CSS |
| Auth + DB | Firebase (Authentication + Firestore) |
| i18n | react-i18next |
| Icons | lucide-react |
| Hosting | Vercel |

---

## Project Structure

```
src/
├── JobTrackerApp.jsx   # Main app component (UI + state)
├── firebase.js         # Firebase auth + Firestore helpers
├── driveSync.js        # Google Drive sync helpers
├── logger.js           # Dev logging utility
├── i18n.js             # i18next configuration
├── main.jsx            # React entry point
├── App.jsx             # Root component
├── locales/
│   ├── en.json         # English translations
│   ├── he.json         # Hebrew translations
│   └── fr.json         # French translations
└── __tests__/
    ├── journey.test.js # Interview journey helper tests
    ├── utils.test.js   # Utility function tests
    └── logic.test.js   # Business logic tests
docs/
├── HLD.md              # High Level Design
└── LLD.md              # Low Level Design
```

---

## Run Locally

```bash
# Clone
git clone https://github.com/joka-7/JobFlowTracker.git
cd JobFlowTracker

# Install
npm install

# Start dev server
npm run dev
```

Open http://localhost:5173

---

## Firebase Setup

1. Create a project at https://console.firebase.google.com
2. Enable **Authentication** → Google Sign-In
3. Enable **Firestore Database** (production mode)
4. Create a Web app → copy the config
5. Replace the config in `src/firebase.js`
6. Add your domain to Firebase → Authentication → Settings → Authorized domains

**Firestore security rules:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

## Deploy to Vercel

1. Push to GitHub
2. Import repo at https://vercel.com
3. Framework preset: **Vite**
4. Deploy

---

## Run Tests

```bash
npm run test
```

---

## Data Schema

Each user's data is stored in Firestore at `users/{uid}`:

```json
{
  "companies": [
    {
      "id": "1234567890",
      "name": "Acme Corp",
      "role": "Software Engineer",
      "status": "tech_interview",
      "priority": "high",
      "location": "Tel Aviv",
      "website": "https://acme.com",
      "linkedinCompany": "https://linkedin.com/company/acme",
      "description": "What they do",
      "generalNotes": "Personal notes",
      "interviews": [
        {
          "type": "Technical Interview",
          "date": "2026-05-01",
          "interviewer": "John",
          "summary": "Went well"
        }
      ]
    }
  ],
  "updatedAt": "2026-05-29T10:00:00.000Z"
}
```
