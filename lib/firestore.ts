import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc, setDoc,
  query, orderBy, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Account, Movement, Shortcut, CustomCategory, MsiPlan } from '@/types';

// ── Accounts ──────────────────────────────────────────────────────────────────

export function subscribeAccounts(uid: string, cb: (accounts: Account[]) => void): Unsubscribe {
  const q = query(collection(db, `users/${uid}/accounts`), orderBy('createdAt'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Account)));
  });
}

export async function addAccount(uid: string, data: Omit<Account, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, `users/${uid}/accounts`), data);
  return ref.id;
}

export async function updateAccount(uid: string, id: string, data: Partial<Account>): Promise<void> {
  await updateDoc(doc(db, `users/${uid}/accounts/${id}`), data);
}

export async function deleteAccount(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/accounts/${id}`));
}

/** One-shot migration: forces every account to MXN currency */
export async function migrateAllAccountsToCurrency(uid: string, currency: string): Promise<void> {
  const snap = await getDocs(collection(db, `users/${uid}/accounts`));
  await Promise.all(
    snap.docs
      .filter(d => d.data().currency !== currency)
      .map(d => updateDoc(d.ref, { currency }))
  );
}

// ── Movements ─────────────────────────────────────────────────────────────────

export function subscribeMovements(uid: string, cb: (movements: Movement[]) => void): Unsubscribe {
  const q = query(collection(db, `users/${uid}/movements`), orderBy('date', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Movement)));
  });
}

export async function addMovement(uid: string, data: Omit<Movement, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, `users/${uid}/movements`), data);
  return ref.id;
}

export async function deleteMovement(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/movements/${id}`));
}

// ── Shortcuts ─────────────────────────────────────────────────────────────────

export function subscribeShortcuts(uid: string, cb: (shortcuts: Shortcut[]) => void): Unsubscribe {
  return onSnapshot(collection(db, `users/${uid}/shortcuts`), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Shortcut)));
  });
}

export async function saveShortcuts(uid: string, shortcuts: Omit<Shortcut, 'id'>[]): Promise<void> {
  const existing = await getDocs(collection(db, `users/${uid}/shortcuts`));
  await Promise.all(existing.docs.map(d => deleteDoc(d.ref)));
  await Promise.all(shortcuts.map(s => addDoc(collection(db, `users/${uid}/shortcuts`), s)));
}

// ── Custom Categories ─────────────────────────────────────────────────────────

export function subscribeCategories(uid: string, cb: (cats: CustomCategory[]) => void): Unsubscribe {
  return onSnapshot(collection(db, `users/${uid}/categories`), snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomCategory)));
  });
}

export async function saveCategory(uid: string, cat: CustomCategory): Promise<void> {
  await setDoc(doc(db, `users/${uid}/categories/${cat.id}`), {
    name: cat.name, icon: cat.icon, type: cat.type,
  });
}

export async function deleteCategory(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/categories/${id}`));
}

export async function saveAllCategories(uid: string, cats: CustomCategory[]): Promise<void> {
  await Promise.all(cats.map(c => setDoc(doc(db, `users/${uid}/categories/${c.id}`), {
    name: c.name, icon: c.icon, type: c.type,
  })));
}

// ── MSI Plans ─────────────────────────────────────────────────────────────────

export function subscribeMsiPlans(uid: string, cb: (plans: MsiPlan[]) => void): Unsubscribe {
  const q = query(collection(db, `users/${uid}/msiPlans`), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as MsiPlan)));
  });
}

export async function addMsiPlan(uid: string, data: Omit<MsiPlan, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, `users/${uid}/msiPlans`), data);
  return ref.id;
}

export async function deleteMsiPlan(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(db, `users/${uid}/msiPlans/${id}`));
}
