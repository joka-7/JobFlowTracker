import { getCollectionName } from './statuses';
import { clearPendingIds } from './utils/pendingSync';

// Firebase web config is a public client identifier, not a secret — it ships in
// the client bundle by design (see .gitleaks.toml and README's "Firebase & your
// data"). Access is controlled by firestore.rules and by Authentication →
// Authorized domains, not by hiding these values.
//
// VITE_FIREBASE_* wins where it is set, so a fork or preview deploy can point
// at its own project without editing this file. The app's own project is the
// fallback: making config env-only would mean a deploy that had not set the
// six variables silently shipped with cloud sync switched off, indistinguishable
// from the feature having been removed. Editing this file directly (see README)
// remains the other supported way to point a fork at a different project.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBeEQR4lW_j0M53kAZMSagma1zo9mRonFw",
  authDomain: "jobflowtracker-7733e.firebaseapp.com",
  projectId: "jobflowtracker-7733e",
  storageBucket: "jobflowtracker-7733e.firebasestorage.app",
  messagingSenderId: "163411158407",
  appId: "1:163411158407:web:042975ed70499f35a7de22"
};

/** Per-value precedence: a set VITE_FIREBASE_* variable, else the app's project. */
export function resolveFirebaseConfig(env = import.meta.env) {
  return {
    apiKey: env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
    projectId: env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
    appId: env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  };
}

const firebaseConfig = resolveFirebaseConfig();

/**
 * True when every Firebase value needed to sign in and sync is present.
 *
 * With the fallback above this only goes false if someone strips the defaults
 * or overrides a variable with an empty string, but the checks that depend on
 * it stay — an unconfigured build must still degrade gracefully rather than
 * boot an SDK that cannot authenticate.
 */
export function isCloudConfigured() {
  return Object.values(firebaseConfig).every((value) => value !== '');
}

// localStorage flags let us avoid touching Firebase on load for fresh visitors.
// SESSION_FLAG marks a previously signed-in session worth restoring; REDIRECT_FLAG
// marks an in-flight redirect sign-in whose result we must collect on next load.
const SESSION_FLAG = 'jft_auth_session';
const REDIRECT_FLAG = 'jft_auth_redirect_pending';

function readFlag(key) {
  try { return window.localStorage.getItem(key) === '1'; } catch { return false; }
}

function writeFlag(key, on) {
  try {
    if (on) window.localStorage.setItem(key, '1');
    else window.localStorage.removeItem(key);
  } catch { /* ignore storage failures */ }
}

// Firebase Auth persists the signed-in user in this IndexedDB store. Detecting it
// (without loading the SDK) lets us restore sessions for users who were already
// signed in before lazy-loading shipped — they predate our SESSION_FLAG.
const FIREBASE_AUTH_DB = 'firebaseLocalStorageDb';
const FIREBASE_AUTH_STORE = 'firebaseLocalStorage';

// Opens the auth DB and resolves true iff it holds a persisted firebase:authUser
// entry. If the DB didn't exist (oldVersion 0), opening creates an empty one —
// we detect that and delete it so fresh visitors aren't left with a phantom DB.
function probePersistedAuthUser() {
  return new Promise((resolve) => {
    let req;
    try { req = window.indexedDB.open(FIREBASE_AUTH_DB); }
    catch { return resolve(false); }
    let created = false;
    req.onupgradeneeded = (e) => { if (e.oldVersion === 0) created = true; };
    req.onerror = () => resolve(false);
    req.onsuccess = () => {
      const db = req.result;
      if (created || !db.objectStoreNames.contains(FIREBASE_AUTH_STORE)) {
        db.close();
        if (created) { try { window.indexedDB.deleteDatabase(FIREBASE_AUTH_DB); } catch { /* ignore */ } }
        return resolve(false);
      }
      try {
        const keysReq = db.transaction(FIREBASE_AUTH_STORE, 'readonly')
          .objectStore(FIREBASE_AUTH_STORE).getAllKeys();
        keysReq.onsuccess = () => {
          const has = (keysReq.result || []).some((k) => String(k).startsWith('firebase:authUser:'));
          db.close();
          resolve(has);
        };
        keysReq.onerror = () => { db.close(); resolve(false); };
      } catch { db.close(); resolve(false); }
    };
  });
}

// True when a previously signed-in session should be restored on load: our own
// flag (set on every sign-in) or Firebase's persisted auth store. Where
// indexedDB.databases() exists (Chromium/WebKit) we use it to skip the probe for
// fresh visitors; where it doesn't (Firefox) we probe directly, which self-cleans
// any empty DB it has to create. Either way the Firebase SDK is never loaded here.
export async function hasRestorableSession() {
  if (!isCloudConfigured()) return false;
  if (readFlag(SESSION_FLAG)) return true;
  try {
    if (typeof window.indexedDB === 'undefined') return false;
    if (window.indexedDB.databases) {
      const dbs = await window.indexedDB.databases();
      if (!dbs.some((d) => d.name === FIREBASE_AUTH_DB)) return false;
    }
    return await probePersistedAuthUser();
  } catch { return false; }
}

// Memoized, lazy Firebase initializer. The SDK is dynamically imported on first
// use so it stays out of the entry bundle and never boots for visitors who don't
// sign in.
let initPromise;
function ensureInit() {
  if (!isCloudConfigured()) {
    throw new Error(
      'Firebase is not configured. Set the VITE_FIREBASE_* variables (see .env.example) or edit src/firebase.js.',
    );
  }
  if (!initPromise) {
    initPromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const {
        initializeFirestore, persistentLocalCache, persistentMultipleTabManager,
      } = await import('firebase/firestore');
      const app = initializeApp(firebaseConfig);
      // Without this, writes made while offline live only in memory and are
      // lost on reload — this doesn't add conflict resolution or multi-device
      // merge (see #76), it just stops offline edits from silently vanishing.
      const db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      });
      return { auth: getAuth(app), db };
    })();
  }
  return initPromise;
}

// The auth watcher fans a single Firebase onAuthStateChanged listener out to all
// registered callbacks. It is started lazily — only for returning signed-in users
// or on an explicit sign-in / redirect completion — so it never boots the SDK for
// fresh visitors.
const authCallbacks = new Set();
let authWatcherPromise;

function startAuthWatcher() {
  if (!authWatcherPromise) {
    authWatcherPromise = (async () => {
      const { auth } = await ensureInit();
      const { onAuthStateChanged } = await import('firebase/auth');
      onAuthStateChanged(auth, (user) => {
        writeFlag(SESSION_FLAG, !!user);
        authCallbacks.forEach((cb) => {
          try { cb(user); } catch (e) { console.error(e); }
        });
      });
    })();
  }
  return authWatcherPromise;
}

/** User-facing message for Firebase Google sign-in failures (header "Sign In"). */
export function formatSignInError(err) {
  const code = err?.code || '';
  const msg = err?.message || '';
  if (code === 'auth/popup-blocked') {
    return 'Popup blocked. Allow popups for this site, then try again.';
  }
  if (code === 'auth/popup-closed-by-user') return 'Sign-in cancelled.';
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : '';
    return host
      ? `Add "${host}" in Firebase → Authentication → Settings → Authorized domains.`
      : 'This site is not in Firebase Authentication → Authorized domains.';
  }
  if (/referrer|API key|API_KEY/i.test(msg)) {
    return 'Google API key blocked this site. In Cloud Console set Browser key → Application restrictions to None (see SECURITY.md).';
  }
  if (/requested action is invalid/i.test(msg)) {
    return 'Google sign-in config error. Check Firebase Authorized domains and API key restrictions (SECURITY.md).';
  }
  return msg || 'Sign-in failed.';
}

/** Call once on app load after Google redirect sign-in. No-op (and no SDK load)
 * unless a redirect sign-in is actually pending. */
export async function completeRedirectSignIn() {
  if (!isCloudConfigured()) return null;
  if (!readFlag(REDIRECT_FLAG)) return null;
  writeFlag(REDIRECT_FLAG, false);
  const { auth } = await ensureInit();
  const { getRedirectResult } = await import('firebase/auth');
  const result = await getRedirectResult(auth);
  startAuthWatcher().catch((e) => console.error('Auth watcher:', e));
  return result?.user ?? null;
}

function shouldFallbackToRedirect(err) {
  const code = err?.code || '';
  const msg = err?.message || '';
  return code === 'auth/popup-blocked'
    || code === 'auth/popup-closed-by-user'
    || code === 'auth/internal-error'
    || /requested action is invalid/i.test(msg)
    || /not authorized|auth site/i.test(msg);
}

export async function signInWithGoogle() {
  const { auth } = await ensureInit();
  const {
    GoogleAuthProvider, signInWithPopup, signInWithRedirect, browserPopupRedirectResolver,
  } = await import('firebase/auth');
  const provider = new GoogleAuthProvider();
  // Start watching auth state so the popup-success path syncs registered consumers.
  startAuthWatcher().catch((e) => console.error('Auth watcher:', e));
  try {
    const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
    return result.user;
  } catch (err) {
    if (shouldFallbackToRedirect(err)) {
      writeFlag(REDIRECT_FLAG, true);
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw err;
  }
}

export async function signOut() {
  const { auth } = await ensureInit();
  const { signOut: firebaseSignOut } = await import('firebase/auth');
  await firebaseSignOut(auth);
  writeFlag(SESSION_FLAG, false);
}

export function onAuthChange(callback) {
  if (!isCloudConfigured()) {
    // Report "signed out" immediately so callers stop waiting on a session
    // that can never arrive — otherwise a header watching this callback sits
    // on "Checking…" forever.
    callback(null);
    return () => {};
  }
  authCallbacks.add(callback);
  // Boot Firebase only to restore a previously signed-in session — never for
  // fresh, sync-free visitors. Covers both our own flag and (for users signed in
  // before this change) Firebase's own persisted auth store.
  hasRestorableSession().then((restore) => {
    if (restore && authCallbacks.size > 0) {
      startAuthWatcher().catch((e) => console.error('Auth watcher:', e));
    }
  });
  return () => { authCallbacks.delete(callback); };
}

export async function loadUserProfile(uid) {
  const { db } = await ensureInit();
  const { doc, getDoc } = await import('firebase/firestore');
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : {};
}

export async function saveUserProfile(uid, data) {
  const { db } = await ensureInit();
  const { doc, setDoc } = await import('firebase/firestore');
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

export async function loadAllItems(uid, mode = 'jobseeker') {
  const { db } = await ensureInit();
  const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
  const colRef = collection(db, 'users', uid, getCollectionName(mode));
  const snap = await getDocs(colRef);

  if (!snap.empty) {
    return snap.docs.map(d => d.data());
  }

  if (mode !== 'jobseeker') return null;

  const rootRef = doc(db, 'users', uid);
  const rootSnap = await getDoc(rootRef);
  if (rootSnap.exists()) {
    const companies = rootSnap.data().companies || [];
    if (companies.length > 0) {
      await batchSaveItems(uid, mode, companies);
      return companies;
    }
  }
  return null;
}

export async function updateItem(uid, mode, item) {
  const { db } = await ensureInit();
  const { doc, setDoc } = await import('firebase/firestore');
  const ref = doc(db, 'users', uid, getCollectionName(mode), String(item.id));
  await setDoc(ref, item);
  // Only once the write has actually landed does this record stop needing to
  // win over a cloud pull (see ./utils/pendingSync).
  clearPendingIds(mode, [item.id]);
}

export async function deleteItem(uid, mode, id) {
  const { db } = await ensureInit();
  const { doc, deleteDoc } = await import('firebase/firestore');
  const ref = doc(db, 'users', uid, getCollectionName(mode), String(id));
  await deleteDoc(ref);
  clearPendingIds(mode, [id]);
}

export async function batchSaveItems(uid, mode, items) {
  if (!items.length) return;
  const { db } = await ensureInit();
  const { doc, writeBatch } = await import('firebase/firestore');
  const CHUNK = 490;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    const chunk = items.slice(i, i + CHUNK);
    chunk.forEach(item => {
      const ref = doc(db, 'users', uid, getCollectionName(mode), String(item.id));
      batch.set(ref, item);
    });
    await batch.commit();
    clearPendingIds(mode, chunk.map(item => item.id));
  }
}
