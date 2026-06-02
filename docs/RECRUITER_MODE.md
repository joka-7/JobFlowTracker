# Recruiter Mode

JobFlowTracker supports two fixed roles chosen once at first launch. There is no runtime toggle.

| Mode | `appMode` value | Primary entity | Firestore path | localStorage key |
|------|-----------------|----------------|----------------|------------------|
| Job seeker | `jobseeker` | Company / application | `users/{uid}/companies/{id}` | `jobTrackerAppV2Data_jobseeker` |
| Recruiter | `recruiter` | Candidate | `users/{uid}/candidates/{id}` | `jobTrackerAppV2Data_recruiter` |

The same kanban UI is reused; labels, statuses, and form fields change per mode.

---

## First launch

1. If `localStorage.appMode` is set → load that mode.
2. Else if legacy `jobTrackerAppV2Data` exists → auto-set `jobseeker` (no mode screen).
3. Else → show [`ModeSelection`](../src/components/ModeSelection.jsx) full-screen picker.

On Google sign-in, `appMode` is written to the user profile document `users/{uid}` and the matching subcollection is loaded.

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

## Translations

All recruiter-specific copy lives under the `recruiter.*` namespace in `src/locales/en.json`, `he.json`, and `fr.json`. The app uses a `tMode(key)` helper that prefixes keys with `recruiter.` when `appMode === 'recruiter'`.

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

This covers `companies`, `candidates`, and the profile doc. Publish in Firebase Console → Firestore → Rules.

---

## Export / import

- Job seeker backup filename: `job-tracker-backup-YYYY-MM-DD.json`
- Recruiter backup filename: `recruiter-tracker-backup-YYYY-MM-DD.json`

Import always writes to the current mode's storage path only.

---

## Configuration source

Status lists and helpers: [`src/statuses.js`](../src/statuses.js)
