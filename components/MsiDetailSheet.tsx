'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { cn, formatCurrency } from '@/lib/utils';
import type { MsiPlan } from '@/types';

interface Props {
  plan: MsiPlan | null;
  cutoffDay?: number;
  currency: string;
  onClose: () => void;
}

function calcPaidMonths(startDate: number, cutoffDay: number | undefined, totalMonths: number): number {
  if (!cutoffDay) {
    const start = new Date(startDate);
    const now = new Date();
    const elapsed = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    return Math.min(Math.max(0, elapsed), totalMonths);
  }
  const now = new Date();
  let count = 0;
  const start = new Date(startDate);
  let cutoff = new Date(start.getFullYear(), start.getMonth(), cutoffDay);
  if (cutoff <= start) cutoff = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, cutoffDay);
  while (cutoff <= now && count < totalMonths) {
    count++;
    cutoff = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, cutoffDay);
  }
  return count;
}

export default function MsiDetailSheet({ plan, cutoffDay, currency, onClose }: Props) {
  const { deleteMsiPlanFn } = useApp();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const dragControls = useDragControls();

  async function handleDelete() {
    if (!plan) return;
    setDeleting(true);
    try {
      await deleteMsiPlanFn(plan.id, plan.movementId, plan.accountId, plan.totalAmount);
      onClose();
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <AnimatePresence>
      {plan && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-[60]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 top-0 bottom-0 max-w-md mx-auto z-[60] bg-white dark:bg-neutral-900 rounded-t-3xl safe-top flex flex-col"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0.05, bottom: 0 }}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.y > 40 || info.velocity.y > 300) onClose();
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={e => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pb-3 pt-1 flex-shrink-0">
              <h2 className="text-lg font-bold dark:text-white flex items-center gap-2">
                <span>📅</span>
                <span>MSI — {plan.description}</span>
              </h2>
              <button onClick={onClose} className="p-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                <X className="w-4 h-4 dark:text-white" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-6 pb-8">
              {(() => {
                const paid = calcPaidMonths(plan.startDate, cutoffDay, plan.months);
                const remaining = plan.months - paid;
                const pct = (paid / plan.months) * 100;
                const amountPaid = paid * plan.monthlyPayment;
                const amountRemaining = plan.totalAmount - amountPaid;

                return (
                  <>
                    {/* Big summary card */}
                    <div className="bg-accent/8 dark:bg-accent/12 rounded-3xl p-5 border border-accent/20 mb-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">Total</p>
                          <p className="font-black text-neutral-900 dark:text-white text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(plan.totalAmount, currency)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-semibold">Mensualidad</p>
                          <p className="font-black text-accent text-2xl" style={{ fontVariantNumeric: 'tabular-nums' }}>
                            {formatCurrency(plan.monthlyPayment, currency)}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1.5">
                          <span>{paid} de {plan.months} meses pagados</span>
                          <span>{pct.toFixed(0)}%</span>
                        </div>
                        <div className="h-3 bg-accent/20 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-accent rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3.5">
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold mb-1">Meses pagados</p>
                        <p className="font-black text-income text-xl">{paid}</p>
                      </div>
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3.5">
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold mb-1">Meses restantes</p>
                        <p className={cn('font-black text-xl', remaining > 0 ? 'text-expense' : 'text-income')}>{remaining}</p>
                      </div>
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3.5">
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold mb-1">Mensualidad</p>
                        <p className="font-black text-accent text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(plan.monthlyPayment, currency)}
                        </p>
                      </div>
                      <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-4 py-3.5">
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 font-semibold mb-1">Total</p>
                        <p className="font-black text-neutral-800 dark:text-white text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(plan.totalAmount, currency)}
                        </p>
                      </div>
                    </div>

                    {/* Remaining amount info */}
                    {remaining > 0 && (
                      <div className="bg-expense/8 dark:bg-expense/12 rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400 font-semibold">Saldo pendiente</span>
                        <span className="font-black text-expense" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(amountRemaining, currency)}
                        </span>
                      </div>
                    )}

                    {/* Delete button */}
                    {!confirmDelete ? (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="w-full py-4 bg-expense/10 dark:bg-expense/15 text-expense font-bold text-base rounded-2xl active:scale-[0.98] transition-transform"
                      >
                        Eliminar plan MSI
                      </button>
                    ) : (
                      <div className="bg-expense/10 dark:bg-expense/15 rounded-2xl p-4">
                        <p className="text-sm font-bold text-expense mb-3 text-center">¿Eliminar este plan MSI?</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mb-4">
                          Se eliminará el plan y el movimiento original. El saldo de la tarjeta se ajustará.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setConfirmDelete(false)}
                            className="flex-1 py-3 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold rounded-xl"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleDelete}
                            disabled={deleting}
                            className="flex-1 py-3 bg-expense text-white font-bold rounded-xl disabled:opacity-40"
                          >
                            {deleting ? 'Eliminando...' : 'Confirmar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
