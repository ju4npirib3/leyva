'use client';

import { useState, useEffect, Fragment } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, Trash2, Pencil, TrendingUp, TrendingDown, CreditCard, Calendar, CheckCircle, ChevronDown } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import {
  formatCurrency, ACCOUNT_TYPE_LABELS, calcPercentChange,
  buildBalanceHistory, CATEGORY_ICONS, daysUntil, nextDateForDay,
} from '@/lib/utils';
import { parseSpanishAmount } from '@/lib/parseSpanishAmount';
import MovementDetailSheet from './MovementDetailSheet';
import EditAccountModal from './EditAccountModal';
import MsiDetailSheet from './MsiDetailSheet';
import type { Account, Movement, MsiPlan } from '@/types';

interface Props {
  account: Account | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
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

export default function AccountDetailSheet({ account, onClose, onDelete }: Props) {
  const { movements, addMovementFn, msiPlans, accounts, payCardFn } = useApp();
  const [payAmount, setPayAmount] = useState('');
  const [paySourceAccountId, setPaySourceAccountId] = useState('');
  const [paying, setPaying] = useState(false);
  const [showPayInput, setShowPayInput] = useState(false);
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedMsi, setSelectedMsi] = useState<MsiPlan | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dragControls = useDragControls();

  useEffect(() => {
    if (account) document.body.classList.add('scroll-locked');
    else document.body.classList.remove('scroll-locked');
    return () => document.body.classList.remove('scroll-locked');
  }, [account]);

  useEffect(() => { setConfirmDelete(false); }, [account?.id]);

  if (!account) return null;

  const isCredit = account.type === 'credit';
  const accountMoves = movements.filter(m => m.accountId === account.id);
  const change = calcPercentChange(account.balance, account.previousBalance);
  const isUp = change >= 0;
  const totalIn = accountMoves.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const totalOut = accountMoves.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const sortedMoves = [...accountMoves].sort((a, b) => b.date - a.date);

  // Investment interest computed values
  const isInvestment = account.type === 'investment';
  const hasInterest = isInvestment && account.interestRate != null && account.interestRate > 0;
  const interestCalc = (() => {
    if (!hasInterest || !account.interestStartDate) return null;
    const principal = account.balance;
    const dailyRate = (account.interestRate! / 100) / 365;
    const msElapsed = Date.now() - account.interestStartDate;
    const daysElapsed = Math.max(0, Math.floor(msElapsed / 86_400_000));
    const currentValue = principal * Math.pow(1 + dailyRate, daysElapsed);
    const interestEarned = currentValue - principal;
    const totalDays = account.termMonths ? account.termMonths * 30 : null;
    const projectedTotal = totalDays ? principal * Math.pow(1 + dailyRate, totalDays) : null;
    const projectedInterest = projectedTotal ? projectedTotal - principal : null;
    const daysRemaining = totalDays ? Math.max(0, totalDays - daysElapsed) : null;
    const progressPct = totalDays ? Math.min(100, (daysElapsed / totalDays) * 100) : null;
    return { principal, daysElapsed, interestEarned, projectedTotal, projectedInterest, daysRemaining, progressPct, totalDays };
  })();

  // Credit card computed values
  const accountMsiPlans = msiPlans.filter(p => p.accountId === account.id);
  // effectiveBalance = what to pay this cycle (total debt minus deferred MSI installments)
  const effectiveBalance = (() => {
    if (!isCredit || accountMsiPlans.length === 0) return account.balance;
    const totalDeferred = accountMsiPlans.reduce((sum, plan) => {
      const paid = calcPaidMonths(plan.startDate, account.cutoffDay, plan.months);
      const remaining = Math.max(0, plan.months - paid);
      const deferred = Math.max(0, remaining - 1) * plan.monthlyPayment;
      return sum + deferred;
    }, 0);
    return Math.max(0, account.balance - totalDeferred);
  })();
  const available = isCredit && account.creditLimit != null
    ? Math.max(0, account.creditLimit - account.balance)
    : null;
  const usedPct = isCredit && account.creditLimit
    ? Math.min(100, (account.balance / account.creditLimit) * 100)
    : 0;
  const daysToPayment = account.paymentDueDay != null ? daysUntil(account.paymentDueDay) : null;
  const daysToCutoff = account.cutoffDay != null ? daysUntil(account.cutoffDay) : null;
  const paymentUrgent = daysToPayment != null && daysToPayment <= 5;

  // Chart — for credit cards with MSI, replace each MSI movement's full amount
  // with its monthly payment so the chart reflects the effective balance (not total debt)
  const chartMovements = isCredit
    ? accountMoves.map(m => {
        const msiPlan = accountMsiPlans.find(p => p.movementId === m.id);
        return msiPlan ? { ...m, amount: msiPlan.monthlyPayment } : m;
      })
    : accountMoves;
  const chartBaseBalance = isCredit ? effectiveBalance : account.balance;
  const historyPoints = buildBalanceHistory(chartBaseBalance, chartMovements);
  const chartData = historyPoints.map(p => ({
    balance: p.balance,
    label: format(new Date(p.date), 'd MMM', { locale: es }),
  }));
  const firstBal = historyPoints[0]?.balance ?? chartBaseBalance;
  const lastBal = historyPoints[historyPoints.length - 1]?.balance ?? chartBaseBalance;
  const chartColor = isCredit
    ? (effectiveBalance === 0 ? '#00C07F' : '#FF3B30')
    : (lastBal >= firstBal ? '#00C07F' : '#FF3B30');

  const nonCreditAccounts = accounts.filter(a => a.type !== 'credit');
  const paySourceAccount = nonCreditAccounts.find(a => a.id === paySourceAccountId) ?? nonCreditAccounts[0] ?? null;
  const payAmt = parseFloat(payAmount) || 0;
  const insufficientFunds = !!paySourceAccount && payAmt > 0 && paySourceAccount.balance < payAmt;

  async function handlePay() {
    if (payAmt <= 0 || !paySourceAccount || insufficientFunds) return;
    setPaying(true);
    try {
      await payCardFn(account!.id, paySourceAccount.id, payAmt);
      setPayAmount('');
      setPaySourceAccountId('');
      setShowPayInput(false);
    } finally {
      setPaying(false);
    }
  }

  return (
    <AnimatePresence>
      {account && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/50 z-50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 top-0 bottom-0 max-w-md mx-auto z-50 bg-white dark:bg-neutral-900 rounded-t-3xl safe-top flex flex-col"
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
            <div
              className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing touch-none"
              onPointerDown={e => dragControls.start(e)}
            >
              <div className="w-10 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Header banner */}
              <div
                className="mx-4 mt-2 rounded-3xl p-5 relative overflow-hidden"
                style={{ background: `linear-gradient(145deg, ${account.color}ee, ${account.color}88)` }}
              >
                <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                <div className="relative flex items-start justify-between mb-1">
                  <div>
                    <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">
                      {isCredit ? '💳 Tarjeta de crédito' : ACCOUNT_TYPE_LABELS[account.type]}
                    </p>
                    <p className="text-white font-bold text-xl">{account.name}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    {(accountMoves.length === 0 || isInvestment) && !confirmDelete && (
                      <button onClick={() => setShowEdit(true)} className="p-2 rounded-full bg-white/20">
                        <Pencil className="w-4 h-4 text-white" />
                      </button>
                    )}
                    {onDelete && (
                      confirmDelete ? (
                        <button
                          onClick={() => { onDelete(account.id); onClose(); }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/80 text-white text-xs font-bold active:scale-95 transition-transform"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          ¿Confirmar?
                        </button>
                      ) : (
                        <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-full bg-white/20">
                          <Trash2 className="w-4 h-4 text-white" />
                        </button>
                      )
                    )}
                    <button onClick={() => { setConfirmDelete(false); onClose(); }} className="p-2 rounded-full bg-white/20">
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </div>

                {isCredit ? (
                  <>
                    <p className="text-white/70 text-xs font-semibold mt-1">
                      {accountMsiPlans.length > 0 ? 'A pagar este ciclo' : 'Deuda actual'}
                    </p>
                    <p className="text-white font-black leading-none mt-1"
                      style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(effectiveBalance, account.currency)}
                    </p>
                    {/* Show total debt separately when there are MSI plans */}
                    {accountMsiPlans.length > 0 && effectiveBalance !== account.balance && (
                      <p className="text-white/60 text-xs mt-1">
                        Total adeudado: {formatCurrency(account.balance, account.currency)}
                      </p>
                    )}

                    {/* Usage bar */}
                    {account.creditLimit && (
                      <div className="mt-3">
                        <div className="flex justify-between text-white/70 text-xs mb-1">
                          <span>Disponible: {formatCurrency(available ?? 0, account.currency)}</span>
                          <span>Límite: {formatCurrency(account.creditLimit, account.currency)}</span>
                        </div>
                        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${usedPct}%`,
                              backgroundColor: usedPct > 80 ? '#FF3B30' : usedPct > 50 ? '#FF9500' : '#00C07F',
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-white font-black leading-none mt-4"
                      style={{ fontSize: 30, fontVariantNumeric: 'tabular-nums' }}>
                      {formatCurrency(account.balance, account.currency)}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="bg-white/20 rounded-full px-2.5 py-1 flex items-center gap-1">
                        {isUp ? <TrendingUp className="w-3 h-3 text-white" /> : <TrendingDown className="w-3 h-3 text-white" />}
                        <span className="text-white text-xs font-bold">{Math.abs(change).toFixed(1)}%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Credit card dates */}
              {isCredit && (account.cutoffDay || account.paymentDueDay) && (
                <div className="flex gap-2 mx-4 mt-3">
                  {account.cutoffDay && (
                    <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-3 py-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        <p className="text-xs text-neutral-500 font-medium">Corte</p>
                      </div>
                      <p className="font-black text-neutral-800 dark:text-white text-base">
                        Día {account.cutoffDay}
                      </p>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        en {daysToCutoff} días
                      </p>
                    </div>
                  )}
                  {account.paymentDueDay && (
                    <div className={`flex-1 rounded-2xl px-3 py-3 ${paymentUrgent ? 'bg-expense/15' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <CreditCard className={`w-3.5 h-3.5 ${paymentUrgent ? 'text-expense' : 'text-neutral-500'}`} />
                        <p className={`text-xs font-medium ${paymentUrgent ? 'text-expense' : 'text-neutral-500'}`}>Pago límite</p>
                      </div>
                      <p className={`font-black text-base ${paymentUrgent ? 'text-expense' : 'text-neutral-800 dark:text-white'}`}>
                        Día {account.paymentDueDay}
                      </p>
                      <p className={`text-xs mt-0.5 ${paymentUrgent ? 'text-expense font-semibold' : 'text-neutral-400'}`}>
                        {paymentUrgent ? `⚠️ ¡${daysToPayment} días!` : `en ${daysToPayment} días`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* MSI Plans — credit cards only */}
              {isCredit && (() => {
                const activePlans = msiPlans.filter(p => p.accountId === account.id && calcPaidMonths(p.startDate, account.cutoffDay, p.months) < p.months);
                if (activePlans.length === 0) return null;
                return (
                  <div className="mx-4 mt-3">
                    <p className="font-bold text-neutral-900 dark:text-white text-sm mb-2">📅 MSI Activos</p>
                    <div className="space-y-2">
                      {activePlans.map(plan => {
                        const paid = calcPaidMonths(plan.startDate, account.cutoffDay, plan.months);
                        const pct = (paid / plan.months) * 100;
                        return (
                          <button
                            key={plan.id}
                            onClick={() => setSelectedMsi(plan)}
                            className="w-full bg-white dark:bg-neutral-800 rounded-2xl p-3.5 text-left active:scale-[0.98] transition-transform"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate flex-1 mr-2">{plan.description}</p>
                              <p className="font-black text-accent text-sm flex-shrink-0">${(plan.monthlyPayment).toFixed(2)}/mes</p>
                            </div>
                            <div className="h-1.5 bg-neutral-100 dark:bg-neutral-700 rounded-full overflow-hidden mb-1.5">
                              <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[11px] text-neutral-400">{paid} de {plan.months} meses pagados · ${(plan.totalAmount - paid * plan.monthlyPayment).toFixed(2)} restante</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Pay card button */}
              {isCredit && effectiveBalance > 0 && (
                <div className="mx-4 mt-3">
                  {!showPayInput ? (
                    <button
                      onClick={() => {
                        setPayAmount(String(effectiveBalance));
                        setPaySourceAccountId(nonCreditAccounts[0]?.id ?? '');
                        setShowPayInput(true);
                      }}
                      className="w-full py-3.5 bg-income text-white font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                    >
                      <CheckCircle className="w-5 h-5" />
                      Pagar tarjeta — {formatCurrency(effectiveBalance, account.currency)}
                    </button>
                  ) : (
                    <div className="bg-income/10 dark:bg-income/15 rounded-2xl p-4">
                      <p className="text-sm font-bold text-income mb-2">💸 ¿Cuánto vas a pagar?</p>
                      <div className="relative mb-3">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                        <input
                          type="text" inputMode="decimal"
                          value={payAmount}
                          onChange={e => setPayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                          className="w-full pl-8 pr-4 py-3 bg-white dark:bg-neutral-800 rounded-xl text-xl font-black dark:text-white outline-none focus:ring-2 focus:ring-income/30"
                          style={{ fontVariantNumeric: 'tabular-nums' }}
                          autoFocus
                        />
                      </div>
                      {nonCreditAccounts.length > 0 ? (
                        <div className="mb-3">
                          <p className="text-xs text-neutral-500 font-medium mb-1.5">Cuenta de origen</p>
                          <div className="relative">
                            <select
                              value={paySourceAccount?.id ?? ''}
                              onChange={e => setPaySourceAccountId(e.target.value)}
                              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 rounded-xl text-sm font-semibold dark:text-white outline-none focus:ring-2 focus:ring-income/30 appearance-none"
                            >
                              {nonCreditAccounts.map(a => (
                                <option key={a.id} value={a.id}>
                                  {a.name} — {formatCurrency(a.balance, a.currency)}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
                          </div>
                          {insufficientFunds && (
                            <p className="text-xs text-expense font-semibold mt-1.5">
                              ⚠️ Saldo insuficiente — disponible: {formatCurrency(paySourceAccount!.balance, paySourceAccount!.currency)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-expense font-semibold mb-3">
                          ⚠️ No tienes cuentas disponibles para realizar el pago
                        </p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setShowPayInput(false); setPayAmount(''); setPaySourceAccountId(''); }}
                          className="flex-1 py-2.5 bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold rounded-xl"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handlePay}
                          disabled={paying || !payAmount || !paySourceAccount || insufficientFunds}
                          className="flex-1 py-2.5 bg-income text-white font-bold rounded-xl disabled:opacity-40"
                        >
                          {paying ? 'Pagando...' : 'Confirmar pago'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="flex mx-4 mt-3 gap-2">
                <div className={`flex-1 rounded-2xl px-3 py-3 ${isCredit ? 'bg-expense/10' : 'bg-income/10'}`}>
                  <p className="text-xs text-neutral-500 font-medium">{isCredit ? 'Gastos' : 'Ingresos'}</p>
                  <p className={`font-black mt-0.5 ${isCredit ? 'text-expense' : 'text-income'}`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {isCredit ? '-' : '+'}{formatCurrency(isCredit ? totalOut : totalIn, account.currency)}
                  </p>
                </div>
                <div className={`flex-1 rounded-2xl px-3 py-3 ${isCredit ? 'bg-income/10' : 'bg-expense/10'}`}>
                  <p className="text-xs text-neutral-500 font-medium">{isCredit ? 'Pagos' : 'Gastos'}</p>
                  <p className={`font-black mt-0.5 ${isCredit ? 'text-income' : 'text-expense'}`}
                    style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(isCredit ? totalIn : totalOut, account.currency)}
                  </p>
                </div>
                <div className="flex-1 bg-neutral-100 dark:bg-neutral-800 rounded-2xl px-3 py-3">
                  <p className="text-xs text-neutral-500 font-medium">Movimientos</p>
                  <p className="font-black text-neutral-800 dark:text-neutral-200 mt-0.5">{accountMoves.length}</p>
                </div>
              </div>

              {/* Savings interest card */}
              {hasInterest && interestCalc && (
                <div className="mx-4 mt-3 bg-income/8 dark:bg-income/10 rounded-2xl p-4 border border-income/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-bold text-neutral-900 dark:text-white text-sm">📈 Intereses</p>
                    <div className="flex gap-2 text-xs font-semibold text-income">
                      <span>{account.interestRate}% anual</span>
                      {account.termMonths && <span>· {account.termMonths} meses</span>}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-white/60 dark:bg-neutral-800/60 rounded-xl px-3 py-2.5">
                      <p className="text-[10px] text-neutral-500 font-medium">Interés ganado</p>
                      <p className="font-black text-income text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        +{formatCurrency(interestCalc.interestEarned, account.currency)}
                      </p>
                      <p className="text-[10px] text-neutral-400">{interestCalc.daysElapsed} días</p>
                    </div>
                    {interestCalc.projectedInterest != null && (
                      <div className="bg-white/60 dark:bg-neutral-800/60 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] text-neutral-500 font-medium">Al vencimiento</p>
                        <p className="font-black text-neutral-800 dark:text-white text-base" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatCurrency(interestCalc.projectedTotal!, account.currency)}
                        </p>
                        <p className="text-[10px] text-neutral-400">+{formatCurrency(interestCalc.projectedInterest, account.currency)}</p>
                      </div>
                    )}
                  </div>

                  {interestCalc.progressPct != null && interestCalc.daysRemaining != null && (
                    <>
                      <div className="h-1.5 bg-income/20 rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full bg-income rounded-full transition-all"
                          style={{ width: `${interestCalc.progressPct}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-neutral-400">
                        <span>Día {interestCalc.daysElapsed}</span>
                        <span>{interestCalc.daysRemaining} días restantes</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Chart */}
              <div className="mx-4 mt-4">
                <p className="font-bold text-neutral-900 dark:text-white mb-3">
                  {isCredit ? 'Historial de deuda' : 'Historial de saldo'}
                </p>
                {chartData.length >= 2 ? (
                  <div className={`bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl p-3 ${isInvestment ? 'pt-2' : 'pt-4'}`}>
                    <ResponsiveContainer width="100%" height={isInvestment ? 90 : 150}>
                      <AreaChart data={chartData} margin={{ top: 2, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#88888820" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                        <YAxis tick={{ fontSize: 10, fill: '#888' }} tickLine={false} axisLine={false}
                          tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} width={44} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1c1c1e', border: 'none', borderRadius: 12, padding: '8px 12px' }}
                          labelStyle={{ color: '#aaa', fontSize: 11 }}
                          formatter={(v: number) => [formatCurrency(v, account.currency), isCredit ? 'Deuda' : 'Saldo']}
                          itemStyle={{ color: '#fff', fontWeight: 700, fontSize: 13 }}
                        />
                        <Area type="monotone" dataKey="balance" stroke={chartColor} strokeWidth={2.5}
                          fill={`url(#grad-${account.id})`} dot={false}
                          activeDot={{ r: 5, fill: chartColor, strokeWidth: 0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="bg-neutral-100 dark:bg-neutral-800 rounded-2xl p-6 flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl">{isCredit ? '💳' : '📈'}</span>
                    <p className="text-sm text-neutral-500">Registra movimientos para ver el historial</p>
                  </div>
                )}
              </div>

              {/* Movements */}
              <div className="mx-4 mt-4 mb-24">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-bold text-neutral-900 dark:text-white">
                    Movimientos {sortedMoves.length > 0 && <span className="text-neutral-400 font-normal text-sm">({sortedMoves.length})</span>}
                  </p>
                </div>
                {sortedMoves.length > 0 ? (
                  <div className="bg-white dark:bg-neutral-800 rounded-2xl overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-700">
                    {sortedMoves.map(m => (
                      <button
                        key={m.id}
                        onClick={() => setSelectedMovement(m)}
                        className="w-full flex items-center gap-3 px-4 py-3 active:bg-neutral-50 dark:active:bg-neutral-700/50 transition-colors text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.type === 'income' ? 'bg-income/10' : 'bg-expense/10'}`}>
                          <span className="text-lg">{CATEGORY_ICONS[m.category] ?? '📦'}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-neutral-900 dark:text-white text-sm truncate">{m.description}</p>
                          <p className="text-xs text-neutral-400 truncate">
                            {m.category} · {format(new Date(m.date), 'd MMM', { locale: es })}
                          </p>
                        </div>
                        <p className={`font-black text-sm ${isCredit ? (m.type === 'expense' ? 'text-expense' : 'text-income') : (m.type === 'income' ? 'text-income' : 'text-expense')}`}
                          style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {isCredit
                            ? (m.type === 'expense' ? '+' : '-')
                            : (m.type === 'income' ? '+' : '-')
                          }{formatCurrency(m.amount, account.currency)}
                        </p>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="bg-neutral-50 dark:bg-neutral-800 rounded-2xl p-6 flex flex-col items-center gap-2 text-center">
                    <span className="text-3xl">📭</span>
                    <p className="text-sm text-neutral-500">Sin movimientos aún</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          <MovementDetailSheet
            movement={selectedMovement}
            onClose={() => setSelectedMovement(null)}
          />

          <EditAccountModal
            account={showEdit ? account : null}
            onClose={() => setShowEdit(false)}
          />

          <MsiDetailSheet
            plan={selectedMsi}
            cutoffDay={account?.cutoffDay}
            currency={account?.currency ?? 'MXN'}
            onClose={() => setSelectedMsi(null)}
          />
        </>
      )}
    </AnimatePresence>
  );
}
