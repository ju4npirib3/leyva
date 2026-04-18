'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import AddMovementModal from '@/components/AddMovementModal';
import AddAccountModal from '@/components/AddAccountModal';
import { Trash2, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, ACCOUNT_TYPE_LABELS, calcPercentChange } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function AccountsPage() {
  const { user, loading } = useAuth();
  const { accounts, movements, deleteAccountFn } = useApp();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  async function handleDelete(id: string) {
    setDeletingId(id);
    await deleteAccountFn(id);
    setDeletingId(null);
  }

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark safe-top pb-28">
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Cuentas</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{accounts.length} cuenta{accounts.length !== 1 ? 's' : ''}</p>
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
        <div className="px-5 space-y-3">
          <AnimatePresence>
            {accounts.map(account => {
              const change = calcPercentChange(account.balance, account.previousBalance);
              const isUp = change >= 0;
              const accountMovements = movements.filter(m => m.accountId === account.id);
              const totalIn = accountMovements.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
              const totalOut = accountMovements.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);

              return (
                <motion.div
                  key={account.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="card overflow-hidden shadow-sm"
                >
                  {/* Card header */}
                  <div
                    className="p-4 relative overflow-hidden"
                    style={{ background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)` }}
                  >
                    <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-white/10" />
                    <div className="relative flex items-start justify-between">
                      <div>
                        <p className="text-white/70 text-xs">{ACCOUNT_TYPE_LABELS[account.type]}</p>
                        <p className="text-white font-bold text-lg">{account.name}</p>
                      </div>
                      <button
                        onClick={() => handleDelete(account.id)}
                        disabled={deletingId === account.id}
                        className="p-2 rounded-full bg-white/20 active:bg-white/30"
                      >
                        <Trash2 className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <p className="text-white text-2xl font-bold mt-3">{formatCurrency(account.balance, account.currency)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="bg-white/20 rounded-full px-2 py-0.5 flex items-center gap-1">
                        {isUp ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white" />}
                        <span className="text-white text-xs font-semibold">{Math.abs(change).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex divide-x divide-neutral-100 dark:divide-neutral-800">
                    <div className="flex-1 px-4 py-3">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Total ingresos</p>
                      <p className="font-bold text-income">{formatCurrency(totalIn)}</p>
                    </div>
                    <div className="flex-1 px-4 py-3">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Total gastos</p>
                      <p className="font-bold text-expense">{formatCurrency(totalOut)}</p>
                    </div>
                    <div className="flex-1 px-4 py-3">
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Movimientos</p>
                      <p className="font-bold text-neutral-800 dark:text-neutral-200">{accountMovements.length}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <BottomNav onAddClick={() => setShowAdd(true)} />
      <AddMovementModal open={showAdd} onClose={() => setShowAdd(false)} />
      <AddAccountModal open={showAddAccount} onClose={() => setShowAddAccount(false)} />
    </div>
  );
}
