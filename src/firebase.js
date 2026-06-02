import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBeEQR4lW_j0M53kAZMSagma1zo9mRonFw",
  authDomain: "jobflowtracker-7733e.firebaseapp.com",
  projectId: "jobflowtracker-7733e",
  storageBucket: "jobflowtracker-7733e.firebasestorage.app",
  messagingSenderId: "163411158407",
  appId: "1:163411158407:web:042975ed70499f35a7de22"
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

// Load companies from subcollection; auto-migrates legacy root-doc format
export async function loadAllCompanies(uid) {
  const colRef = collection(db, 'users', uid, 'companies');
  const snap = await getDocs(colRef);

  if (!snap.empty) {
    return snap.docs.map(d => d.data());
  }

  // Legacy: single root document with companies array
  const rootRef = doc(db, 'users', uid);
  const rootSnap = await getDoc(rootRef);
  if (rootSnap.exists()) {
    const companies = rootSnap.data().companies || [];
    if (companies.length > 0) {
      await batchSaveCompanies(uid, companies);
      return companies;
    }
  }
  return null;
}

// Write a single company doc (add or update)
export async function updateCompany(uid, company) {
  const ref = doc(db, 'users', uid, 'companies', String(company.id));
  await setDoc(ref, company);
}

// Delete a single company doc
export async function deleteFirestoreCompany(uid, id) {
  const ref = doc(db, 'users', uid, 'companies', String(id));
  await deleteDoc(ref);
}

// Write all companies as individual subcollection docs (chunked to stay under batch limit)
export async function batchSaveCompanies(uid, companies) {
  if (!companies.length) return;
  const CHUNK = 490;
  for (let i = 0; i < companies.length; i += CHUNK) {
    const batch = writeBatch(db);
    companies.slice(i, i + CHUNK).forEach(company => {
      const ref = doc(db, 'users', uid, 'companies', String(company.id));
      batch.set(ref, company);
    });
    await batch.commit();
  }
}

// Publish a read-only snapshot to the public shares collection
export async function publishShare(uid, companies) {
  const ref = doc(db, 'shares', uid);
  await setDoc(ref, {
    companies,
    sharedAt: new Date().toISOString(),
  });
}

// Load a publicly shared snapshot by UID
export async function loadSharedData(uid) {
  const ref = doc(db, 'shares', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}

// Legacy helpers kept for any external references
export async function loadUserData(uid) {
  return loadAllCompanies(uid);
}

export async function saveUserData(uid, companies) {
  return batchSaveCompanies(uid, companies);
}
