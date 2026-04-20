'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import AddMovementModal from '@/components/AddMovementModal';
import AddAccountModal from '@/components/AddAccountModal';
import AccountDetailSheet from '@/components/AccountDetailSheet';
import { Plus, TrendingUp, TrendingDown, GripVertical } from 'lucide-react';
import {
  formatCurrency, ACCOUNT_TYPE_LABELS, calcPercentChange, buildBalanceHistory,
} from '@/lib/utils';
import { Reorder, useDragControls, motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts';
import type { Account } from '@/types';

export default function AccountsPage() {
  const { user, loading } = useAuth();
  const { accounts, movements, deleteAccountFn, reorderAccountsFn } = useApp();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [localAccounts, setLocalAccounts] = useState<Account[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();

  const selectedAccount = selectedAccountId
    ? (accounts.find(a => a.id === selectedAccountId) ?? null)
    : null;

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Keep local list in sync with context (when accounts load or change externally)
  useEffect(() => {
    setLocalAccounts(accounts);
  }, [accounts]);

  function handleReorder(newOrder: Account[]) {
    setLocalAccounts(newOrder);
    // Debounce Firestore write
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      reorderAccountsFn(newOrder.map(a => a.id));
    }, 600);
  }

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark safe-top pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Cuentas</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowAddAccount(true)}
          className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/30"
        >
          <Plus className="w-5 h-5 text-white" />
        </button>
      </div>

      {accounts.length === 0 ? (
        <div className="mx-5 card p-10 flex flex-col items-center gap-3 text-center">
          <span className="text-5xl">💳</span>
          <p className="font-semibold text-neutral-700 dark:text-neutral-300">Sin cuentas aún</p>
          <p className="text-sm text-neutral-400">Agrega tu primera cuenta para comenzar</p>
          <button
            onClick={() => setShowAddAccount(true)}
            className="mt-2 px-6 py-2.5 bg-accent text-white font-semibold rounded-2xl"
          >
            Agregar cuenta
          </button>
        </div>
      ) : (
        <Reorder.Group
          values={localAccounts}
          onReorder={handleReorder}
          axis="y"
          className="px-5 space-y-3"
          layoutScroll
        >
          <AnimatePresence>
            {localAccounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                movements={movements.filter(m => m.accountId === account.id)}
                onSelect={() => setSelectedAccountId(account.id)}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      )}

      <AccountDetailSheet
        account={selectedAccount}
        onClose={() => setSelectedAccountId(null)}
        onDelete={async (id) => { await deleteAccountFn(id); setSelectedAccountId(null); }}
      />

      <BottomNav onAddClick={() => setShowAdd(true)} />
      <AddMovementModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        defaultAccountId={selectedAccountId ?? undefined}
      />
      <AddAccountModal open={showAddAccount} onClose={() => setShowAddAccount(false)} />
    </div>
  );
}

function AccountCard({
  account,
  movements,
  onSelect,
}: {
  account: Account;
  movements: { date: number; type: string; amount: number }[];
  onSelect: () => void;
}) {
  const dragControls = useDragControls();
  const change = calcPercentChange(account.balance, account.previousBalance);
  const isUp = change >= 0;
  const totalIn = movements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const totalOut = movements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const history = buildBalanceHistory(account.balance, movements);
  const chartData = history.map(p => ({ balance: p.balance }));
  const firstBal = history[0]?.balance ?? account.balance;
  const lastBal = history[history.length - 1]?.balance ?? account.balance;
  const chartColor = lastBal >= firstBal ? '#00C07F' : '#FF3B30';

  return (
    <Reorder.Item
      value={account}
      dragListener={false}
      dragControls={dragControls}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.15)', zIndex: 10 }}
      transition={{ duration: 0.18 }}
      className="card overflow-hidden shadow-sm list-none"
      style={{ position: 'relative' }}
    >
      {/* Drag handle */}
      <div
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={e => { e.stopPropagation(); dragControls.start(e); }}
      >
        <GripVertical className="w-5 h-5 text-white/50" />
      </div>

      <button onClick={onSelect} className="w-full text-left active:opacity-90 transition-opacity">
        {/* Card header */}
        <div
          className="p-4 pr-12 relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${account.color}ee, ${account.color}99)` }}
        >
          <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </p>
              <p className="text-white font-bold text-lg">{account.name}</p>
            </div>
            <div className="bg-white/20 rounded-full px-2.5 py-1 flex items-center gap-1">
              {isUp ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white" />}
              <span className="text-white text-xs font-bold">{Math.abs(change).toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex items-end justify-between mt-3">
            <p className="text-white font-black" style={{ fontSize: 26, fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(account.balance, account.currency)}
            </p>
            {chartData.length >= 2 && (
              <div className="w-24 h-10 opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`mini-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.5} />
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip contentStyle={{ display: 'none' }} cursor={false} />
                    <Area type="monotone" dataKey="balance" stroke={chartColor} strokeWidth={2}
                      fill={`url(#mini-${account.id})`} dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex divide-x divide-neutral-100 dark:divide-neutral-800">
          <div className="flex-1 px-4 py-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Ingresos</p>
            <p className="font-bold text-income" style={{ fontVariantNumeric: 'tabular-nums' }}>
              +{formatCurrency(totalIn, account.currency)}
            </p>
          </div>
          <div className="flex-1 px-4 py-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Gastos</p>
            <p className="font-bold text-expense" style={{ fontVariantNumeric: 'tabular-nums' }}>
              -{formatCurrency(totalOut, account.currency)}
            </p>
          </div>
          <div className="flex-1 px-4 py-3">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Movimientos</p>
            <p className="font-bold text-neutral-800 dark:text-neutral-200">{movements.length}</p>
          </div>
        </div>
      </button>
    </Reorder.Item>
  );
}
