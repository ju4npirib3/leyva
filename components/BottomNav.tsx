'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BarChart2, CreditCard, Settings, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
  onAddClick: () => void;
}

const NAV_ITEMS = [
  { href: '/home', icon: Home, label: 'Inicio' },
  { href: '/charts', icon: BarChart2, label: 'Gráficas' },
  { href: '/accounts', icon: CreditCard, label: 'Cuentas' },
  { href: '/settings', icon: Settings, label: 'Ajustes' },
];

export default function BottomNav({ onAddClick }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 inset-x-0 max-w-md mx-auto safe-bottom z-40">
      <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl border-t border-neutral-200/50 dark:border-neutral-800/50 px-2 pt-2 pb-1">
        <div className="flex items-center justify-around">
          {NAV_ITEMS.slice(0, 2).map(item => (
            <NavLink key={item.href} {...item} active={pathname === item.href} />
          ))}

          {/* Center Add Button */}
          <button
            onClick={onAddClick}
            className="flex flex-col items-center -mt-6"
          >
            <div className="w-14 h-14 rounded-full bg-accent shadow-lg shadow-accent/40 flex items-center justify-center active:scale-95 transition-transform">
              <Plus className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-[10px] mt-1 text-neutral-500 dark:text-neutral-400">Agregar</span>
          </button>

          {NAV_ITEMS.slice(2).map(item => (
            <NavLink key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavLink({ href, icon: Icon, label, active }: {
  href: string; icon: React.ElementType; label: string; active: boolean;
}) {
  return (
    <Link href={href} className="flex flex-col items-center gap-0.5 px-3 py-1">
      <Icon
        className={cn('w-6 h-6 transition-colors', active ? 'text-accent' : 'text-neutral-400 dark:text-neutral-500')}
        strokeWidth={active ? 2.5 : 1.8}
      />
      <span className={cn('text-[10px] font-medium transition-colors', active ? 'text-accent' : 'text-neutral-400 dark:text-neutral-500')}>
        {label}
      </span>
    </Link>
  );
}
