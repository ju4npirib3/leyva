'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, ACCOUNT_TYPE_LABELS, calcPercentChange } from '@/lib/utils';
import type { Account } from '@/types';

interface Props { onAddAccount: () => void; }

export default function AccountsCarousel({ onAddAccount }: Props) {
  const { accounts } = useApp();

  return (
    <motion.div
      className="mb-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex items-center justify-between px-5 mb-3">
        <h3 className="font-semibold text-neutral-900 dark:text-white">Mis cuentas</h3>
        <button onClick={onAddAccount} className="text-xs font-medium text-accent">Ver todo</button>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x scrollbar-hide px-5 pb-1">
        {accounts.map(account => (
          <AccountCard key={account.id} account={account} />
        ))}
        <AddAccountCard onClick={onAddAccount} />
      </div>
    </motion.div>
  );
}

function AccountCard({ account }: { account: Account }) {
  const change = calcPercentChange(account.balance, account.previousBalance);
  const isUp = change >= 0;

  return (
    <div
      className="snap-start flex-shrink-0 w-44 rounded-2xl p-4 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)` }}
    >
      {/* Decorative circle */}
      <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />

      <div className="relative">
        <p className="text-white/70 text-xs font-medium mb-0.5">{ACCOUNT_TYPE_LABELS[account.type]}</p>
        <p className="text-white font-semibold text-sm truncate">{account.name}</p>
        <p className="text-white font-bold text-xl mt-3 leading-none">{formatCurrency(account.balance)}</p>
        <div className="flex items-center gap-1 mt-2">
          <div className="bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
            {isUp
              ? <TrendingUp className="w-3 h-3 text-white" />
              : <TrendingDown className="w-3 h-3 text-white" />
            }
            <span className="text-white text-xs font-semibold">{Math.abs(change).toFixed(1)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function AddAccountCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="snap-start flex-shrink-0 w-44 rounded-2xl p-4 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-2 active:bg-neutral-100 dark:active:bg-neutral-800 transition-colors"
    >
      <div className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
        <Plus className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
      </div>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 text-center">Agregar cuenta</p>
    </button>
  );
}
