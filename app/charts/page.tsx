'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import BottomNav from '@/components/BottomNav';
import AddMovementModal from '@/components/AddMovementModal';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, CATEGORY_ICONS } from '@/lib/utils';
import { cn } from '@/lib/utils';

type Period = '7d' | '30d' | '90d' | 'all';

const COLORS = ['#007AFF', '#FF3B30', '#FF9500', '#34C759', '#5856D6', '#FF2D55', '#AF52DE', '#00C7BE'];

export default function ChartsPage() {
  const { user, loading } = useAuth();
  const { movements, accounts } = useApp();
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [period, setPeriod] = useState<Period>('30d');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  const now = Date.now();
  const periodMs: Record<Period, number> = {
    '7d': 7 * 86400000,
    '30d': 30 * 86400000,
    '90d': 90 * 86400000,
    all: Infinity,
  };

  const filtered = movements.filter(m => {
    const inPeriod = now - m.date <= periodMs[period];
    const inAccount = selectedAccount === 'all' || m.accountId === selectedAccount;
    return inPeriod && inAccount && m.type === 'expense';
  });

  const byCategory = filtered.reduce<Record<string, number>>((acc, m) => {
    acc[m.category] = (acc[m.category] ?? 0) + m.amount;
    return acc;
  }, {});

  const pieData = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }));

  const totalSpent = pieData.reduce((s, d) => s + d.value, 0);

  // Monthly bar data
  const incomeByMonth: Record<string, number> = {};
  const expenseByMonth: Record<string, number> = {};
  movements.forEach(m => {
    if (now - m.date > periodMs['90d']) return;
    const key = new Date(m.date).toLocaleString('es', { month: 'short' });
    if (m.type === 'income') incomeByMonth[key] = (incomeByMonth[key] ?? 0) + m.amount;
    if (m.type === 'expense') expenseByMonth[key] = (expenseByMonth[key] ?? 0) + m.amount;
  });
  const barData = Object.keys({ ...incomeByMonth, ...expenseByMonth }).map(m => ({
    name: m,
    Ingresos: incomeByMonth[m] ?? 0,
    Gastos: expenseByMonth[m] ?? 0,
  }));

  return (
    <div className="min-h-screen bg-bg-light dark:bg-bg-dark safe-top pb-28">
      <div className="px-5 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">Gráficas</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Análisis de tus finanzas</p>
      </div>

      {/* Chart type toggle */}
      <div className="flex gap-2 px-5 mb-4">
        {(['pie', 'bar'] as const).map(t => (
          <button
            key={t}
            onClick={() => setChartType(t)}
            className={cn(
              'flex-1 py-2 rounded-xl text-sm font-semibold transition-all',
              chartType === t
                ? 'bg-accent text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
            )}
          >
            {t === 'pie' ? 'Por categoría' : 'Ingresos vs Gastos'}
          </button>
        ))}
      </div>

      {chartType === 'pie' ? (
        <>
          {/* Filters */}
          <div className="flex gap-2 px-5 mb-4 overflow-x-auto scrollbar-hide">
            {(['7d', '30d', '90d', 'all'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all',
                  period === p
                    ? 'bg-accent text-white'
                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                )}
              >
                {p === 'all' ? 'Todo' : p === '7d' ? '7 días' : p === '30d' ? '30 días' : '90 días'}
              </button>
            ))}
          </div>

          <div className="flex gap-2 px-5 mb-5 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedAccount('all')}
              className={cn(
                'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                selectedAccount === 'all'
                  ? 'bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border-transparent'
                  : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
              )}
            >
              Todas
            </button>
            {accounts.map(a => (
              <button
                key={a.id}
                onClick={() => setSelectedAccount(a.id)}
                className={cn(
                  'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border',
                  selectedAccount === a.id
                    ? 'text-white border-transparent'
                    : 'border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400'
                )}
                style={selectedAccount === a.id ? { backgroundColor: a.color } : {}}
              >
                {a.name}
              </button>
            ))}
          </div>

          {pieData.length === 0 ? (
            <div className="mx-5 card p-10 flex flex-col items-center gap-3">
              <span className="text-5xl">📊</span>
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Sin datos</p>
              <p className="text-sm text-neutral-400 text-center">Registra gastos para ver tu análisis</p>
            </div>
          ) : (
            <>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="px-5 mb-4">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Total gastado</p>
                <p className="text-2xl font-bold text-expense">{formatCurrency(totalSpent)}</p>
              </div>

              <div className="mx-5 card overflow-hidden divide-y divide-neutral-100 dark:divide-neutral-800">
                {pieData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xl">{CATEGORY_ICONS[item.name] ?? '📦'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{item.name}</p>
                      <div className="h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full mt-1 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${(item.value / totalSpent) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{formatCurrency(item.value)}</p>
                      <p className="text-xs text-neutral-400">{((item.value / totalSpent) * 100).toFixed(0)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="px-5">
          {barData.length === 0 ? (
            <div className="card p-10 flex flex-col items-center gap-3">
              <span className="text-5xl">📊</span>
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Sin datos</p>
            </div>
          ) : (
            <div className="card p-4">
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-4">Últimos 90 días</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="Ingresos" fill="#00C07F" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Gastos" fill="#FF3B30" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <BottomNav onAddClick={() => setShowAdd(true)} />
      <AddMovementModal open={showAdd} onClose={() => setShowAdd(false)} />
    </div>
  );
}
