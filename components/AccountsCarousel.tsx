'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import {
  formatCurrency, ACCOUNT_TYPE_LABELS, calcPercentChange, buildBalanceHistory, daysUntil,
} from '@/lib/utils';
import AccountDetailSheet from './AccountDetailSheet';
import type { Account } from '@/types';

interface Props {
  onAddAccount: () => void;
  onAccountSelected?: (id: string | null) => void;
}

export default function AccountsCarousel({ onAddAccount, onAccountSelected }: Props) {
  const { accounts, movements, deleteAccountFn } = useApp();
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const selectedAccount = selectedAccountId ? (accounts.find(a => a.id === selectedAccountId) ?? null) : null;

  function selectAccount(id: string | null) {
    setSelectedAccountId(id);
    onAccountSelected?.(id);
  }

  return (
    <motion.div
      className="mb-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
    >
      <div className="flex items-center justify-between px-5 mb-3">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white tracking-tight">Mis cuentas</h3>
        <button onClick={onAddAccount} className="text-sm font-semibold text-accent">+ Nueva</button>
      </div>

      <div className="flex gap-3 overflow-x-auto snap-x scrollbar-hide px-5 pb-2">
        {accounts.map(account => (
          <AccountCard
            key={account.id}
            account={account}
            movements={movements.filter(m => m.accountId === account.id)}
            onClick={() => selectAccount(account.id)}
          />
        ))}
        <AddAccountCard onClick={onAddAccount} />
      </div>

      <AccountDetailSheet
        account={selectedAccount}
        onClose={() => selectAccount(null)}
        onDelete={async (id) => { await deleteAccountFn(id); selectAccount(null); }}
      />
    </motion.div>
  );
}

function AccountCard({
  account,
  movements,
  onClick,
}: {
  account: Account;
  movements: { date: number; type: string; amount: number }[];
  onClick: () => void;
}) {
  const change = calcPercentChange(account.balance, account.previousBalance);
  const isUp = change >= 0;

  // Build sparkline data
  const history = buildBalanceHistory(account.balance, movements);
  const sparkValues = history.map(p => p.balance);
  const sparkMin = Math.min(...sparkValues);
  const sparkMax = Math.max(...sparkValues);
  const sparkRange = sparkMax - sparkMin || 1;

  // Build SVG polyline points (60×28 viewBox)
  const W = 60, H = 28;
  const pts = sparkValues.map((v, i) => {
    const x = sparkValues.length > 1 ? (i / (sparkValues.length - 1)) * W : W / 2;
    const y = H - ((v - sparkMin) / sparkRange) * (H - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const sparkColor = isUp ? '#00C07F' : '#FF3B30';

  return (
    <button
      onClick={onClick}
      className="snap-start flex-shrink-0 w-56 rounded-3xl p-5 relative overflow-hidden shadow-lg active:scale-[0.97] transition-transform text-left"
      style={{ background: `linear-gradient(145deg, ${account.color}ee, ${account.color}99)` }}
    >
      {/* Decorative circles */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/8 pointer-events-none" />

      <div className="relative">
        <p className="text-white/75 text-xs font-semibold uppercase tracking-wider mb-0.5">
          {account.type === 'credit' ? '💳 Crédito' : ACCOUNT_TYPE_LABELS[account.type]}
        </p>
        <p className="text-white font-bold text-base truncate leading-tight">{account.name}</p>

        {account.type === 'credit' ? (
          /* Credit card mini view */
          <>
            <p className="text-white/60 text-xs mt-2">Deuda actual</p>
            <p className="text-white font-black mt-0.5 leading-none"
              style={{ fontSize: 24, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(account.balance, account.currency)}
            </p>
            {account.creditLimit && (
              <>
                <div className="h-1.5 bg-white/20 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (account.balance / account.creditLimit) * 100)}%`,
                      backgroundColor: account.balance / account.creditLimit > 0.8 ? '#FF3B30'
                        : account.balance / account.creditLimit > 0.5 ? '#FF9500' : '#00C07F',
                    }}
                  />
                </div>
                <p className="text-white/60 text-[10px] mt-1">
                  Disp. {formatCurrency(Math.max(0, account.creditLimit - account.balance), account.currency)}
                </p>
              </>
            )}
            {account.paymentDueDay && (
              <div className={`mt-2 rounded-xl px-2 py-1 inline-flex items-center gap-1 ${daysUntil(account.paymentDueDay) <= 5 ? 'bg-expense/80' : 'bg-white/20'}`}>
                <span className="text-white text-[10px] font-bold">
                  {daysUntil(account.paymentDueDay) <= 5
                    ? `⚠️ Pago en ${daysUntil(account.paymentDueDay)}d`
                    : `Pago: día ${account.paymentDueDay}`}
                </span>
              </div>
            )}
          </>
        ) : (
          /* Regular account view */
          <>
            <p className="text-white font-black mt-3 leading-none tracking-tight"
              style={{ fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(account.balance, account.currency)}
            </p>
            <div className="flex items-end justify-between mt-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1 flex items-center gap-1">
                {isUp ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white" />}
                <span className="text-white text-xs font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {Math.abs(change).toFixed(1)}%
                </span>
              </div>
              {sparkValues.length >= 2 && (
                <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="opacity-80" preserveAspectRatio="none">
                  <polyline points={pts} fill="none" stroke={sparkColor}
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </>
        )}
      </div>
    </button>
  );
}

function AddAccountCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="snap-start flex-shrink-0 w-56 rounded-3xl p-5 border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex flex-col items-center justify-center gap-3 active:bg-neutral-100 dark:active:bg-neutral-800/50 transition-colors"
    >
      <div className="w-12 h-12 rounded-full bg-accent/10 dark:bg-accent/20 flex items-center justify-center">
        <Plus className="w-6 h-6 text-accent" />
      </div>
      <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 text-center">
        Agregar cuenta
      </p>
    </button>
  );
}
