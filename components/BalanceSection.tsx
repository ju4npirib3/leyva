'use client';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency } from '@/lib/utils';

export default function BalanceSection() {
  const { totalBalance, balanceChange } = useApp();
  const isUp = balanceChange >= 0;

  return (
    <motion.div
      className="px-5 py-5"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 mb-1">Balance total</p>
      <div className="flex items-end gap-3">
        <h2 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
          {formatCurrency(totalBalance)}
        </h2>
        {totalBalance !== 0 && (
          <div className={`flex items-center gap-1 mb-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isUp ? 'bg-income/15 text-income' : 'bg-expense/15 text-expense'}`}>
            {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(balanceChange).toFixed(1)}%
          </div>
        )}
      </div>
    </motion.div>
  );
}
