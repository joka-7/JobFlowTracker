import { getCollectionName } from './statuses';

const firebaseConfig = {
  apiKey: "AIzaSyBeEQR4lW_j0M53kAZMSagma1zo9mRonFw",
  authDomain: "jobflowtracker-7733e.firebaseapp.com",
  projectId: "jobflowtracker-7733e",
  storageBucket: "jobflowtracker-7733e.firebasestorage.app",
  messagingSenderId: "163411158407",
  appId: "1:163411158407:web:042975ed70499f35a7de22"
};

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

// Memoized, lazy Firebase initializer. The SDK is dynamically imported on first
// use so it stays out of the entry bundle and never boots for visitors who don't
// sign in.
let initPromise;
function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      const { initializeApp } = await import('firebase/app');
      const { getAuth } = await import('firebase/auth');
      const { getFirestore } = await import('firebase/firestore');
      const app = initializeApp(firebaseConfig);
      return { auth: getAuth(app), db: getFirestore(app) };
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

/** User-facing message for Firebase Google sign-in failures (header "Connect Drive"). */
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
  authCallbacks.add(callback);
  // Only boot Firebase eagerly to restore a previously signed-in session.
  if (readFlag(SESSION_FLAG)) {
    startAuthWatcher().catch((e) => console.error('Auth watcher:', e));
  }
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
}

export async function deleteItem(uid, mode, id) {
  const { db } = await ensureInit();
  const { doc, deleteDoc } = await import('firebase/firestore');
  const ref = doc(db, 'users', uid, getCollectionName(mode), String(id));
  await deleteDoc(ref);
}

export async function batchSaveItems(uid, mode, items) {
  if (!items.length) return;
  const { db } = await ensureInit();
  const { doc, writeBatch } = await import('firebase/firestore');
  const CHUNK = 490;
  for (let i = 0; i < items.length; i += CHUNK) {
    const batch = writeBatch(db);
    items.slice(i, i + CHUNK).forEach(item => {
      const ref = doc(db, 'users', uid, getCollectionName(mode), String(item.id));
      batch.set(ref, item);
    });
    await batch.commit();
  }
}

export async function loadAllCompanies(uid) {
  return loadAllItems(uid, 'jobseeker');
}

export async function updateCompany(uid, company) {
  return updateItem(uid, 'jobseeker', company);
}

export async function deleteFirestoreCompany(uid, id) {
  return deleteItem(uid, 'jobseeker', id);
}

export async function batchSaveCompanies(uid, companies) {
  return batchSaveItems(uid, 'jobseeker', companies);
}

export async function loadUserData(uid) {
  return loadAllCompanies(uid);
}

export async function saveUserData(uid, companies) {
  return batchSaveCompanies(uid, companies);
}
