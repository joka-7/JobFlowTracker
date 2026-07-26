import { useState, useRef, useEffect, useCallback } from 'react';
import { onAuthChange, loadAllItems, saveUserProfile } from '../firebase';

/**
 * Wires Firebase auth for a single synced collection: tracks the signed-in
 * user, loads cloud data on sign-in and on tab refocus, and exposes a
 * manual `syncNow` for a "sync" button. Callers own the collection's state;
 * this hook only decides when to (re)fetch it and hands sanitized results
 * back via `onData`.
 *
 * `sanitizeAndFilter`/`onData`/`onSignedIn` are read through a ref so the
 * auth/visibility subscriptions (kept alive for the component's lifetime)
 * always call the latest closures without needing to be memoized by the
 * caller or re-subscribing on every render.
 */
export function useCloudSync({ mode, sanitizeAndFilter, onData, onSignedIn }) {
  const [user, setUser] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const userRef = useRef(null);
  useEffect(() => { userRef.current = user; }, [user]);

  const callbacksRef = useRef({ sanitizeAndFilter, onData, onSignedIn });
  useEffect(() => {
    callbacksRef.current = { sanitizeAndFilter, onData, onSignedIn };
  });

  const fetchAndApply = useCallback(async (uid) => {
    const data = await loadAllItems(uid, mode);
    if (data && data.length > 0) {
      const { sanitizeAndFilter: sanitize, onData: apply } = callbacksRef.current;
      apply(sanitize(data, mode));
      return true;
    }
    return false;
  }, [mode]);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setSyncing(true);
        try {
          await saveUserProfile(firebaseUser.uid, { appMode: mode });
          const hasData = await fetchAndApply(firebaseUser.uid);
          const { onSignedIn: notify } = callbacksRef.current;
          if (notify) notify(hasData);
        } catch (e) { console.error(e); }
        setSyncing(false);
      }
    });
    return unsub;
  }, [mode, fetchAndApply]);

  useEffect(() => {
    const handleVisibility = async () => {
      const firebaseUser = userRef.current;
      if (document.visibilityState === 'visible' && firebaseUser) {
        setSyncing(true);
        try { await fetchAndApply(firebaseUser.uid); } catch (e) { console.error(e); }
        setSyncing(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [fetchAndApply]);

  const syncNow = useCallback(async () => {
    if (!user || syncing) return;
    setSyncing(true);
    try { await fetchAndApply(user.uid); } catch (e) { console.error(e); }
    setSyncing(false);
  }, [user, syncing, fetchAndApply]);

  return { user, syncing, syncNow };
}
