'use client';

import { motion } from 'framer-motion';
import { useApp } from '@/contexts/AppContext';
import { formatCurrency, CATEGORY_ICONS } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';

function groupByDate(movements: ReturnType<typeof useApp>['movements']) {
  const groups: Record<string, typeof movements> = {};
  for (const m of movements) {
    const d = new Date(m.date);
    const key = isToday(d)
      ? 'Hoy'
      : isYesterday(d)
      ? 'Ayer'
      : format(d, 'd MMM yyyy', { locale: es });
    if (!groups[key]) groups[key] = [];
    groups[key].push(m);
  }
  return groups;
}

export default function MovementsList() {
  const { movements } = useApp();

  if (movements.length === 0) {
    return (
      <div className="px-5 mb-8">
        <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">Movimientos</h3>
        <div className="card p-6 flex flex-col items-center gap-2 text-center">
          <span className="text-4xl">📋</span>
          <p className="font-medium text-neutral-700 dark:text-neutral-300">Sin movimientos</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-500">Registra tu primer ingreso o gasto</p>
        </div>
      </div>
    );
  }

  const groups = groupByDate(movements.slice(0, 30));

  return (
    <motion.div
      className="px-5 mb-8"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
    >
      <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">Movimientos</h3>
      <div className="space-y-4">
        {Object.entries(groups).map(([date, items]) => (
          <div key={date}>
            <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 mb-2 uppercase tracking-wider">{date}</p>
            <div className="card overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((m, i) => (
                <motion.div
                  key={m.id}
                  className="flex items-center gap-3 px-4 py-3"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${m.type === 'income' ? 'bg-income/10' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                    <span className="text-xl">{CATEGORY_ICONS[m.category] ?? '📦'}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-neutral-900 dark:text-white text-sm truncate">{m.description}</p>
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 truncate">{m.accountName} · {m.category}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${m.type === 'income' ? 'text-income' : 'text-expense'}`}>
                      {m.type === 'income' ? '+' : '-'}{formatCurrency(m.amount)}
                    </p>
                    <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      {format(new Date(m.date), 'HH:mm')}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
