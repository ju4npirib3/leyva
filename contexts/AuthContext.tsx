'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithRedirect, signInWithPopup,
  getRedirectResult, signOut, User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import type { AppUser } from '@/types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toAppUser(u: User): AppUser {
  return {
    uid: u.uid,
    name: u.displayName ?? 'Usuario',
    email: u.email ?? '',
    photoURL: u.photoURL,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Fallback: if Firebase doesn't respond in 6s, unblock the app
    const timeout = setTimeout(() => setLoading(false), 6000);

    getRedirectResult(auth)
      .then(result => {
        if (result?.user) setUser(toAppUser(result.user));
      })
      .catch((err: unknown) => {
        const code = (err as { code?: string }).code ?? '';
        if (code && code !== 'auth/no-current-user') {
          setAuthError(`Error (${code}). Verifica la configuración de Firebase.`);
        }
      });

    const unsub = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      clearTimeout(timeout);
      setUser(firebaseUser ? toAppUser(firebaseUser) : null);
      setLoading(false);
    });
    return () => { clearTimeout(timeout); unsub(); };
  }, []);

  async function signInWithGoogle() {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const msg = (err as { message?: string }).message ?? String(err);
      if (code === 'auth/popup-blocked' || msg.toLowerCase().includes('blocked')) {
        try {
          await signInWithRedirect(auth, googleProvider);
        } catch (redirectErr: unknown) {
          const rCode = (redirectErr as { code?: string }).code ?? '';
          const rMsg = (redirectErr as { message?: string }).message ?? String(redirectErr);
          setAuthError(`Error redirect: ${rCode || rMsg}`);
        }
      } else if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setAuthError(`Error: ${code || msg}`);
      }
    }
  }

  async function logout() {
    await signOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, authError, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
