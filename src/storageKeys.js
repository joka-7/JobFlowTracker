/**
 * Canonical localStorage keys for app mode and onboarding/welcome state.
 * Imported by app UI, e2e helpers, and unit tests — keep in sync.
 */
export const STORAGE_KEYS = {
  appMode: 'appMode',
  enabledModes: 'enabledModes',
  jobSeekerOnboarding: 'hasCompletedOnboarding',
  recruiterOnboarding: 'hasCompletedOnboarding_recruiter',
  tasksWelcome: 'hasCompletedOnboarding_tasks',
};

/** Shared task/step label library (localStorage; synced to Firestore when signed in). */
export const TASKS_LABELS_KEY = 'tasksLabelsV1';

/** User-chosen small/medium/large cut-points on the effort ladder (localStorage). */
export const TASKS_EFFORT_TIERS_KEY = 'tasksEffortTiersV1';

/**
 * Returns the array of user-selected enabled modes, or null if not yet configured
 * (first launch or existing user who hasn't visited Settings yet).
 */
export function getEnabledModes() {
  const raw = localStorage.getItem(STORAGE_KEYS.enabledModes);
  if (!raw) return null;
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0) return arr;
  } catch { /* malformed JSON — fall through to null */ }
  return null;
}

export const APP_MODES = {
  jobseeker: 'jobseeker',
  recruiter: 'recruiter',
  tasks: 'tasks',
};
