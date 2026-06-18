# Modes Reference

JobFlowTracker supports three modes that can be switched freely at any time using the header mode switcher. Each mode stores its data in a separate localStorage key and Firestore subcollection — switching modes never affects other modes' data.

| Mode | `appMode` value | Primary entity | Firestore path | localStorage key |
|------|-----------------|----------------|----------------|------------------|
| Job seeker | `jobseeker` | Company / application | `users/{uid}/companies/{id}` | `jobTrackerAppV2Data_jobseeker` |
| Recruiter | `recruiter` | Candidate | `users/{uid}/candidates/{id}` | `jobTrackerAppV2Data_recruiter` |
| Task manager | `tasks` | Task (with steps) | `users/{uid}/tasks/{id}` | `jobTrackerAppV2Data_tasks` |

---

## First launch & switching

1. If `localStorage.appMode` is set → load that mode directly (no picker shown).
2. Else if legacy `jobTrackerAppV2Data` exists → auto-set `jobseeker`.
3. Else → show [`ModeSelection`](../src/components/ModeSelection.jsx) full-screen picker (3 options).

**Switching at any time:** The `ModeSwitcher` component in every app header (icon buttons, desktop) or `ModeDropdown` (compact dropdown, mobile menu) updates `localStorage.appMode` and triggers an immediate re-render. The onboarding wizard is only shown on the very first visit ever, not when switching modes.

On Google sign-in, `appMode` is written to `users/{uid}` and the matching subcollection is loaded.

### Enabling / disabling modes

Users can hide modes they don't use from the **⚙️ Settings** modal (`APIKeySettings.jsx`), which lists all 3 modes with toggle buttons. At least one mode must stay enabled. The selection is saved to `localStorage.enabledModes` (see `STORAGE_KEYS.enabledModes` / `getEnabledModes()` in [`src/storageKeys.js`](../src/storageKeys.js)) and read by both `ModeSwitcher` and `ModeDropdown` to filter which modes are shown. If the current mode is disabled, the app falls back to the first remaining enabled mode. When `enabledModes` is unset (default), all 3 modes are available.

---

## Recruiter statuses (9)

| ID | EN label |
|----|----------|
| `applied` | Application Received |
| `screening` | Initial Screening |
| `phone_screen` | Phone Screen |
| `technical` | Technical Interview |
| `final_interview` | Final Interview |
| `offer_extended` | Offer Extended |
| `offer_accepted` | Offer Accepted |
| `rejected` | Rejected |
| `withdrawn` | Withdrawn |

Terminal (inactive pipeline): `rejected`, `withdrawn`, `offer_accepted`.

---

## Recruiter form fields

Shared with job seeker: `name` (candidate name), `role` (position applied), `location`, `status`, `priority`, `interviews`, `generalNotes`, `rejection`.

Recruiter-only:

| Field | Purpose |
|-------|---------|
| `linkedinCandidate` | Candidate LinkedIn URL |
| `currentRole` | Current job title |
| `expectedSalary` | Salary expectations |
| `source` | Referral, LinkedIn, etc. |

Hidden in recruiter mode: `website`, `linkedinCompany`, `description`, `products`, AI Assistant.

---

## Task manager statuses & steps

**Task statuses (4):** `active`, `on_hold`, `completed`, `cancelled`

**Step statuses (4, cycled by clicking the icon):** `todo → in_progress → done → blocked → todo`

See [LLD.md](LLD.md) for the full `Task` and `Step` object schemas.

---

## Translations

All recruiter-specific copy lives under the `recruiter.*` namespace in `src/locales/{en,he,fr}.json`. The app uses a `tMode(key)` helper that prefixes keys with `recruiter.` when `appMode === 'recruiter'`.

All task manager copy lives under the `tasks.*` namespace.

---

## Firestore security rules

```javascript
match /users/{userId} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
  match /{document=**} {
    allow read, write: if request.auth != null && request.auth.uid == userId;
  }
}
```

This covers `companies`, `candidates`, `tasks`, and the profile doc. Publish in Firebase Console → Firestore → Rules.

---

## Export / import

Each mode exports only its own data. Backup filenames:
- Job seeker: `job-tracker-backup-*.json`
- Recruiter: `recruiter-tracker-backup-*.json`
- Task manager: `tasks-backup-*.json`

Import always writes to the current mode's storage path only.

---

## Configuration source

Status lists and helpers: [`src/statuses.js`](../src/statuses.js)  
Mode switcher: [`src/components/ModeSwitcher.jsx`](../src/components/ModeSwitcher.jsx)
