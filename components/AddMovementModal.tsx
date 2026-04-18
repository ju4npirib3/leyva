'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn, INCOME_CATEGORIES, EXPENSE_CATEGORIES, CATEGORY_ICONS, formatCurrency } from '@/lib/utils';
import type { MovementType } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  defaultType?: MovementType;
  defaultCategory?: string;
}

export default function AddMovementModal({ open, onClose, defaultType = 'expense', defaultCategory }: Props) {
  const { user } = useAuth();
  const { accounts, addMovementFn } = useApp();
  const [type, setType] = useState<MovementType>(defaultType);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(defaultCategory ?? '');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  async function handleSubmit() {
    if (!amount || !accountId || !category || !user) return;
    const account = accounts.find(a => a.id === accountId);
    if (!account) return;
    setSaving(true);
    try {
      await addMovementFn({
        accountId,
        accountName: account.name,
        type,
        amount: parseFloat(amount),
        category,
        description: description || category,
        date: Date.now(),
        createdAt: Date.now(),
      });
      onClose();
      setAmount('');
      setDescription('');
      setCategory('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/40 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-50 bg-white dark:bg-neutral-900 rounded-t-3xl safe-bottom"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            <div className="px-6 pb-6 pt-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold dark:text-white">Nuevo movimiento</h2>
                <button onClick={onClose} className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <X className="w-4 h-4 dark:text-white" />
                </button>
              </div>

              {/* Type toggle */}
              <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-1 mb-5">
                {(['income', 'expense'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setType(t); setCategory(''); }}
                    className={cn(
                      'flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all',
                      type === t
                        ? t === 'income'
                          ? 'bg-income text-white shadow-sm'
                          : 'bg-expense text-white shadow-sm'
                        : 'text-neutral-500 dark:text-neutral-400'
                    )}
                  >
                    {t === 'income' ? '↑ Ingreso' : '↓ Gasto'}
                  </button>
                ))}
              </div>

              {/* Amount */}
              <div className="mb-4">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Monto</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="mb-4">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 block">Categoría</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                        category === c
                          ? 'bg-accent text-white border-accent'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-transparent'
                      )}
                    >
                      <span>{CATEGORY_ICONS[c] ?? '📦'}</span> {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account */}
              {accounts.length > 0 && (
                <div className="mb-4">
                  <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Cuenta</label>
                  <div className="relative">
                    <select
                      value={accountId}
                      onChange={e => setAccountId(e.target.value)}
                      className="w-full appearance-none pl-4 pr-10 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl font-medium dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                    >
                      {accounts.map(a => (
                        <option key={a.id} value={a.id}>{a.name} — {formatCurrency(a.balance)}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  </div>
                </div>
              )}

              {/* Description */}
              <div className="mb-6">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Descripción (opcional)</label>
                <input
                  type="text"
                  placeholder="Agregar nota..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={!amount || !category || !accountId || saving}
                className="w-full py-4 bg-accent text-white font-bold rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Guardar movimiento'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
