import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "VITE_FIREBASE_API_KEY_REMOVED_FROM_HISTORY",
  authDomain: "jobflowtracker-7733e.firebaseapp.com",
  projectId: "jobflowtracker-7733e",
  storageBucket: "jobflowtracker-7733e.firebasestorage.app",
  messagingSenderId: "163431158407",
  appId: "1:163431158407:web:042975ed70499f35a7de22"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  return result.user;
}

export async function signOut() {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function loadUserData(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data().companies || [];
  return null;
}

export async function saveUserData(uid, companies) {
  const ref = doc(db, 'users', uid);
  await setDoc(ref, { companies, updatedAt: new Date().toISOString() });
}
