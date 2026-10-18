import { useState, useRef, useEffect, useCallback } from 'react';
import {
  onAuthChange, loadAllItems, saveUserProfile, hasRestorableSession,
  signOut, deleteAllSyncedData, isCloudConfigured,
} from '../driveSync';
import { getStorageKey } from '../statuses';
import { APP_MODES, TASKS_LABELS_KEY } from '../storageKeys';
import { isFocusPullDue } from '../utils/focusPull';
import {
  readDataOwner, writeDataOwner, clearLocalSyncState, countPending,
} from '../utils/pendingSync';

const ALL_MODES = Object.values(APP_MODES);

/** Every key that holds one account's records. Mode choice and UI preferences stay. */
const ACCOUNT_DATA_KEYS = [...ALL_MODES.map(getStorageKey), TASKS_LABELS_KEY];

/** Remove this browser's copy of the account's data and its sync bookkeeping. */
export function clearLocalAccountData(storage = window.localStorage) {
  ACCOUNT_DATA_KEYS.forEach((key) => storage.removeItem(key));
  clearLocalSyncState(ALL_MODES, storage);
}

/** Records in any mode still waiting for a Drive write. Only meaningful once a device has connected. */
export function countUnsyncedRecords() {
  return readDataOwner() ? ALL_MODES.reduce((sum, m) => sum + countPending(m), 0) : 0;
}

/**
 * Wires Google Drive sync for a single collection: tracks the connected
 * account, pulls on connect, on tab refocus (at most every 30 s, see
 * ../utils/focusPull) and on `syncNow`. Callers own the collection's state;
 * this hook decides when to pull and hands the sanitized cloud records and
 * tombstones to `onData(cloudItems, uid, { deletedIds })`. The merge runs even
 * when Drive holds nothing yet, so a first connect uploads what is on the device.
 *
 * Local data owned by a different account is never merged into this one's
 * Drive: it is cleared and `onLocalDataDiscarded` lets the caller drop its
 * in-memory copy. Sign-out does the same up front (see `signOutAndClear`).
 *
 * Callbacks are read through a ref so the subscriptions (kept alive for the
 * component's lifetime) always call the latest closures.
 */
export function useCloudSync({
  mode, sanitizeAndFilter, onData, onSignedIn, onLocalDataDiscarded, onSyncError,
}) {
  const [user, setUser] = useState(null);
  // onAuthChange answers at once with the stored session (or none). Until it
  // has, a header can't tell "checking" from "signed out" and would offer
  // Connect Drive right before the real session resolves.
  const [authResolved, setAuthResolved] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  const callbacksRef = useRef({ sanitizeAndFilter, onData, onSignedIn, onLocalDataDiscarded, onSyncError });
  useEffect(() => {
    callbacksRef.current = { sanitizeAndFilter, onData, onSignedIn, onLocalDataDiscarded, onSyncError };
  });

  const reportError = useCallback((e) => {
    const { onSyncError: report } = callbacksRef.current;
    if (report) report(e);
    else console.error(e);
  }, []);

  // The mode currently on screen. A pull started for another mode that lands
  // after a switch must not reach `onData`, which by then is the new mode's.
  const modeRef = useRef(mode);
  useEffect(() => { modeRef.current = mode; }, [mode]);

  const lastPullAtRef = useRef(null);
  const pull = useCallback(async (uid) => {
    lastPullAtRef.current = Date.now();
    const cloud = await loadAllItems(uid, mode);
    if (modeRef.current !== mode) return false;
    const { sanitizeAndFilter: sanitize, onData: apply } = callbacksRef.current;
    apply(sanitize(cloud?.items ?? [], mode), uid, { deletedIds: cloud?.deletedIds ?? [] });
    return (cloud?.items.length ?? 0) > 0;
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    hasRestorableSession().then((restorable) => {
      if (!cancelled && !restorable) setAuthResolved(true);
    });
    const unsub = onAuthChange(async (driveUser) => {
      setAuthResolved(true);
      setUser(driveUser);
      if (!driveUser) return;
      setSyncing(true);
      try {
        const owner = readDataOwner();
        if (owner && owner !== driveUser.uid) {
          clearLocalAccountData();
          const { onLocalDataDiscarded: discard } = callbacksRef.current;
          if (discard) discard();
        }
        writeDataOwner(driveUser.uid);
        await saveUserProfile(driveUser.uid, { appMode: mode });
        const hasData = await pull(driveUser.uid);
        const { onSignedIn: notify } = callbacksRef.current;
        if (notify) notify(hasData);
      } catch (e) { reportError(e); }
      setSyncing(false);
    });
    // If the stored session never confirms (blocked network, ad blocker),
    // don't leave the header stuck on "checking…".
    const fallbackTimer = setTimeout(() => setAuthResolved(true), 4000);
    return () => { cancelled = true; unsub(); clearTimeout(fallbackTimer); };
  }, [mode, pull, reportError]);

  useEffect(() => {
    const handleVisibility = async () => {
      const driveUser = userRef.current;
      if (document.visibilityState !== 'visible' || !driveUser
        || !isFocusPullDue(lastPullAtRef.current, Date.now())) return;
      setSyncing(true);
      try { await pull(driveUser.uid); } catch (e) { reportError(e); }
      setSyncing(false);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [pull, reportError]);

  const syncNow = useCallback(async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try { await pull(user.uid); } catch (e) { reportError(e); }
    setSyncing(false);
  }, [user, syncing, pull, reportError]);

  /**
   * Disconnect and remove this device's copy of the account's data, so the
   * next person to connect here neither sees it nor gets it merged into their
   * Drive. Throws (leaving everything in place) if sign-out itself fails.
   */
  const signOutAndClear = useCallback(async () => {
    await signOut();
    clearLocalAccountData();
    window.location.reload();
  }, []);

  /** Delete every synced file from Drive, revoke access, and clear this device. */
  const deleteSyncedDataAndClear = useCallback(async () => {
    await deleteAllSyncedData();
    clearLocalAccountData();
    window.location.reload();
  }, []);

  return {
    user, authResolved, syncing, syncNow,
    cloudConfigured: isCloudConfigured(),
    signOutAndClear, deleteSyncedDataAndClear,
  };
}
