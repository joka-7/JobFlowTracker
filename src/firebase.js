import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { getCollectionName } from './statuses';

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

export async function loadUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : {};
}

export async function saveUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

function collectionRef(uid, mode) {
  return collection(db, 'users', uid, getCollectionName(mode));
}

export async function loadAllItems(uid, mode = 'jobseeker') {
  const colRef = collectionRef(uid, mode);
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
  const ref = doc(db, 'users', uid, getCollectionName(mode), String(item.id));
  await setDoc(ref, item);
}

export async function deleteItem(uid, mode, id) {
  const ref = doc(db, 'users', uid, getCollectionName(mode), String(id));
  await deleteDoc(ref);
}

export async function batchSaveItems(uid, mode, items) {
  if (!items.length) return;
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

export async function publishShare(uid, companies) {
  const ref = doc(db, 'shares', uid);
  await setDoc(ref, {
    companies,
    sharedAt: new Date().toISOString(),
  });
}

export async function loadSharedData(uid) {
  const ref = doc(db, 'shares', uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();
  return null;
}
