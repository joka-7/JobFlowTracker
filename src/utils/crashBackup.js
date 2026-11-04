import { getStorageKey } from '../statuses';
import { TASKS_LABELS_KEY } from '../storageKeys.js';

function readJsonArray(storage, key) {
  const raw = storage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

/**
 * The backup a crashed mode can still offer, read straight from storage. The
 * shape matches what that mode's own import accepts: tasks carry their label
 * library, job seeker / recruiter records are a plain list.
 */
export function buildCrashBackup(mode, storage = window.localStorage) {
  const items = readJsonArray(storage, getStorageKey(mode));
  if (mode === 'tasks') {
    return { version: 2, tasks: items, labels: readJsonArray(storage, TASKS_LABELS_KEY) };
  }
  return items;
}
