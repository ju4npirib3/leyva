'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { cn, ACCOUNT_COLORS, ACCOUNT_TYPE_LABELS } from '@/lib/utils';
import type { AccountType } from '@/types';

interface Props { open: boolean; onClose: () => void; }

const TYPES: AccountType[] = ['checking', 'savings', 'cash', 'investment', 'credit'];

export default function AddAccountModal({ open, onClose }: Props) {
  const { addAccountFn } = useApp();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(ACCOUNT_COLORS[0]);
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!name || !balance) return;
    setSaving(true);
    try {
      await addAccountFn({
        name,
        type,
        balance: parseFloat(balance),
        previousBalance: parseFloat(balance),
        color,
        currency,
        createdAt: Date.now(),
      });
      onClose();
      setName('');
      setBalance('');
      setType('checking');
      setColor(ACCOUNT_COLORS[0]);
      setCurrency('USD');
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
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 inset-x-0 max-w-md mx-auto z-50 bg-white dark:bg-neutral-900 rounded-t-3xl safe-bottom"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            <div className="px-6 pb-6 pt-2">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold dark:text-white">Nueva cuenta</h2>
                <button onClick={onClose} className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <X className="w-4 h-4 dark:text-white" />
                </button>
              </div>

              {/* Name */}
              <div className="mb-4">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Mi cuenta bancaria"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                />
              </div>

              {/* Type */}
              <div className="mb-4">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 block">Tipo</label>
                <div className="flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-sm font-medium transition-all border',
                        type === t
                          ? 'bg-accent text-white border-accent'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-transparent'
                      )}
                    >
                      {ACCOUNT_TYPE_LABELS[t]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Balance */}
              <div className="mb-4">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Balance inicial</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-semibold">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={balance}
                    onChange={e => setBalance(e.target.value)}
                    className="w-full pl-8 pr-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl text-xl font-bold dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                  />
                </div>
              </div>

              {/* Currency */}
              <div className="mb-4">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1 block">Moneda</label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="w-full px-4 py-3.5 bg-neutral-100 dark:bg-neutral-800 rounded-2xl dark:text-white outline-none focus:ring-2 focus:ring-accent/30"
                >
                  <option value="USD">USD — Dólar</option>
                  <option value="MXN">MXN — Peso mexicano</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="COP">COP — Peso colombiano</option>
                  <option value="ARS">ARS — Peso argentino</option>
                </select>
              </div>

              {/* Color */}
              <div className="mb-6">
                <label className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-2 block">Color</label>
                <div className="flex gap-3">
                  {ACCOUNT_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={cn(
                        'w-8 h-8 rounded-full transition-transform',
                        color === c && 'scale-125 ring-2 ring-white ring-offset-1 dark:ring-offset-neutral-900'
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!name || !balance || saving}
                className="w-full py-4 bg-accent text-white font-bold rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                {saving ? 'Guardando...' : 'Crear cuenta'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
