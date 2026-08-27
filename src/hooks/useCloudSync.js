import { useState, useRef, useEffect, useCallback } from 'react';
import {
  onAuthChange, loadAllItems, saveUserProfile, hasRestorableSession,
} from '../firebase';

/**
 * Wires Firebase auth for a single synced collection: tracks the signed-in
 * user, loads cloud data on sign-in and on tab refocus, and exposes a
 * manual `syncNow` for a "sync" button. Callers own the collection's state;
 * this hook only decides when to (re)fetch it and hands sanitized results
 * back via `onData(cloudData, uid)` — the `uid` lets a caller that needs to
 * merge-and-push-back do so without racing this hook's own `user` state
 * (which lags a render behind the auth callback that triggered the fetch).
 *
 * `sanitizeAndFilter`/`onData`/`onSignedIn` are read through a ref so the
 * auth/visibility subscriptions (kept alive for the component's lifetime)
 * always call the latest closures without needing to be memoized by the
 * caller or re-subscribing on every render.
 */
export function useCloudSync({ mode, sanitizeAndFilter, onData, onSignedIn }) {
  const [user, setUser] = useState(null);
  // onAuthChange only starts the (async) Firebase auth watcher — and only
  // calls back at all — for a session hasRestorableSession() says exists;
  // for a fresh visitor it never fires, by design (see ../firebase), so
  // `user` staying null there is already the right answer. The gap this
  // flag closes is the returning-user case: `user` stays null for a beat
  // while that restorable session is actually being confirmed, and without
  // this flag a header can't tell that apart from "definitely signed out" —
  // it would show a false "disconnected" Connect button, inviting the user
  // to work as if offline right before the real session resolves and pulls
  // cloud data on top of whatever they just typed.
  const [authResolved, setAuthResolved] = useState(false);
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
      apply(sanitize(data, mode), uid);
      return true;
    }
    return false;
  }, [mode]);

  useEffect(() => {
    let cancelled = false;
    // Fast path: hasRestorableSession() is a cheap local check (our own
    // flag, or an IndexedDB probe — never a network round-trip), so for a
    // fresh visitor with nothing to restore we know immediately there's no
    // session coming and can resolve right away instead of waiting on the
    // fallback timer below. For a returning user it resolves true, and
    // `authResolved` instead waits for onAuthChange's real callback, which
    // is guaranteed to fire in that case (see ../firebase).
    hasRestorableSession().then((restorable) => {
      if (!cancelled && !restorable) setAuthResolved(true);
    });
    const unsub = onAuthChange(async (firebaseUser) => {
      setAuthResolved(true);
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
    // Belt-and-suspenders: if a restorable session was detected but the
    // actual Firebase bootstrap that follows never completes (blocked
    // network, ad blocker), don't leave the header stuck on "checking…"
    // forever — fall back to showing the disconnected state so the user can
    // still act (and manually connect, if the session really is gone).
    const fallbackTimer = setTimeout(() => setAuthResolved(true), 4000);
    return () => { cancelled = true; unsub(); clearTimeout(fallbackTimer); };
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

  return { user, authResolved, syncing, syncNow };
}
