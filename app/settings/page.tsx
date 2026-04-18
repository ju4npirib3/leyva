'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/ThemeProvider';
import BottomNav from '@/components/BottomNav';
import AddMovementModal from '@/components/AddMovementModal';
import {
  Sun, Moon, Smartphone, ChevronRight, LogOut,
  Shield, Bell, HelpCircle, Info,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark safe-top pb-28">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Configuración</h1>
      </div>

      {/* Profile */}
      <div className="mx-5 card p-4 flex items-center gap-4 mb-6 shadow-sm">
        {user.photoURL ? (
          <Image src={user.photoURL} alt={user.name} width={56} height={56} className="w-14 h-14 rounded-full" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-accent flex items-center justify-center">
            <span className="text-white text-xl font-bold">{getInitials(user.name)}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 dark:text-white truncate">{user.name}</p>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">{user.email}</p>
        </div>
      </div>

      {/* Theme */}
      <div className="mx-5 mb-4">
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-1">Apariencia</p>
        <div className="card overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800 shadow-sm">
          {([
            { value: 'light', label: 'Claro', Icon: Sun },
            { value: 'dark', label: 'Oscuro', Icon: Moon },
            { value: 'system', label: 'Sistema', Icon: Smartphone },
          ] as const).map(({ value, label, Icon }) => (
            <button
              key={value}
              onClick={() => setTheme(value)}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-neutral-50 dark:active:bg-neutral-800/50 transition-colors"
            >
              <div className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center',
                theme === value ? 'bg-accent' : 'bg-neutral-100 dark:bg-neutral-800'
              )}>
                <Icon className={cn('w-4 h-4', theme === value ? 'text-white' : 'text-neutral-500 dark:text-neutral-400')} />
              </div>
              <span className="flex-1 text-left font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
              {theme === value && (
                <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Other settings */}
      <div className="mx-5 mb-4">
        <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-1">General</p>
        <div className="card overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800 shadow-sm">
          {[
            { label: 'Notificaciones', Icon: Bell },
            { label: 'Privacidad y seguridad', Icon: Shield },
            { label: 'Ayuda', Icon: HelpCircle },
            { label: 'Acerca de Leyva', Icon: Info },
          ].map(({ label, Icon }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 px-4 py-3.5 active:bg-neutral-50 dark:active:bg-neutral-800/50 transition-colors"
            >
              <div className="w-9 h-9 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
                <Icon className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              </div>
              <span className="flex-1 text-left font-medium text-neutral-800 dark:text-neutral-200">{label}</span>
              <ChevronRight className="w-4 h-4 text-neutral-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Logout */}
      <div className="mx-5 mb-4">
        <button
          onClick={handleLogout}
          className="w-full card p-4 flex items-center gap-3 shadow-sm active:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 rounded-xl bg-expense/10 flex items-center justify-center">
            <LogOut className="w-4 h-4 text-expense" />
          </div>
          <span className="font-semibold text-expense">Cerrar sesión</span>
        </button>
      </div>

      <p className="text-center text-xs text-neutral-400 dark:text-neutral-600 mt-6">Leyva v1.0.0</p>

      <BottomNav onAddClick={() => setShowAdd(true)} />
      <AddMovementModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
