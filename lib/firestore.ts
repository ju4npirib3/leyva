import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  query, orderBy, onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Account, Movement, Shortcut } from '@/types';

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
