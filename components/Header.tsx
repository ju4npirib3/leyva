'use client';

import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { getGreeting, getInitials } from '@/lib/utils';
import { Bell } from 'lucide-react';

export default function Header() {
  const { user } = useAuth();
  if (!user) return null;

  const firstName = user.name.split(' ')[0];

  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div className="relative">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.name}
              width={44}
              height={44}
              className="w-11 h-11 rounded-full object-cover"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-accent flex items-center justify-center">
              <span className="text-white font-bold text-base">{getInitials(user.name)}</span>
            </div>
          )}
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-income rounded-full border-2 border-bg-light dark:border-bg-dark" />
        </div>

        {/* Greeting */}
        <div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-none mb-0.5">{getGreeting()}</p>
          <p className="font-semibold text-neutral-900 dark:text-white leading-none">{firstName} 👋</p>
        </div>
      </div>

      <button className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center relative">
        <Bell className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
      </button>
    </div>
  );
}
