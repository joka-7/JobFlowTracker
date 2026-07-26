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
  } catch {}
  return null;
}

export const APP_MODES = {
  jobseeker: 'jobseeker',
  recruiter: 'recruiter',
  tasks: 'tasks',
};
