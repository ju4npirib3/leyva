'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    router.replace(user ? '/home' : '/login');
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-bg-light dark:bg-bg-dark">
      <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
    </div>
  );
}
