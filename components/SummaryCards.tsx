'use client';

import { motion } from 'framer-motion';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/utils';

export default function SummaryCards() {
  const { last24hIncome, last24hIncomeChange, last24hExpense, last24hExpenseChange } = useApp();

  return (
    <div className="grid grid-cols-2 gap-3 px-5 mb-5">
      <SummaryCard
        label="Ingresos"
        sublabel="24h"
        amount={last24hIncome}
        change={last24hIncomeChange}
        type="income"
        delay={0.15}
      />
      <SummaryCard
        label="Gastos"
        sublabel="24h"
        amount={last24hExpense}
        change={last24hExpenseChange}
        type="expense"
        delay={0.2}
      />
    </div>
  );
}

function SummaryCard({ label, sublabel, amount, change, type, delay }: {
  label: string;
  sublabel: string;
  amount: number;
  change: number;
  type: 'income' | 'expense';
  delay: number;
}) {
  const isIncome = type === 'income';
  const color = isIncome ? '#00C07F' : '#FF3B30';
  const bgColor = isIncome ? 'bg-income/10 dark:bg-income/15' : 'bg-expense/10 dark:bg-expense/15';
  const textColor = isIncome ? 'text-income' : 'text-expense';
  const isUp = change >= 0;

  return (
    <motion.div
      className="card p-4 shadow-sm"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center`}>
          {isIncome
            ? <ArrowDownLeft className="w-5 h-5" style={{ color }} />
            : <ArrowUpRight className="w-5 h-5" style={{ color }} />
          }
        </div>
        {amount > 0 && (
          <span className={`text-xs font-semibold ${isUp && !isIncome ? 'text-expense' : isUp ? 'text-income' : 'text-expense'}`}>
            {isUp ? '▲' : '▼'} {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">{label} <span className="text-neutral-400">{sublabel}</span></p>
      <p className="font-bold text-lg text-neutral-900 dark:text-white leading-none">
        {formatCurrency(amount)}
      </p>
    </motion.div>
  );
}
