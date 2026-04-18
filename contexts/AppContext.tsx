'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeAccounts, subscribeMovements, subscribeShortcuts,
  addAccount, updateAccount, deleteAccount, addMovement, saveShortcuts,
} from '@/lib/firestore';
import { DEFAULT_SHORTCUTS, calcPercentChange } from '@/lib/utils';
import type { Account, Movement, Shortcut } from '@/types';

interface AppContextValue {
  accounts: Account[];
  movements: Movement[];
  shortcuts: Shortcut[];
  totalBalance: number;
  balanceChange: number;
  last24hIncome: number;
  last24hIncomeChange: number;
  last24hExpense: number;
  last24hExpenseChange: number;
  addAccountFn: (data: Omit<Account, 'id'>) => Promise<void>;
  updateAccountFn: (id: string, data: Partial<Account>) => Promise<void>;
  deleteAccountFn: (id: string) => Promise<void>;
  addMovementFn: (data: Omit<Movement, 'id'>) => Promise<void>;
  updateShortcutsFn: (shortcuts: Omit<Shortcut, 'id'>[]) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);

  useEffect(() => {
    if (!user) { setAccounts([]); setMovements([]); setShortcuts([]); return; }
    const unsub1 = subscribeAccounts(user.uid, setAccounts);
    const unsub2 = subscribeMovements(user.uid, setMovements);
    const unsub3 = subscribeShortcuts(user.uid, (s) => {
      setShortcuts(s.length > 0 ? s : DEFAULT_SHORTCUTS.map((d, i) => ({ ...d, id: String(i) })));
    });
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [user]);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const prevTotalBalance = accounts.reduce((s, a) => s + a.previousBalance, 0);
  const balanceChange = calcPercentChange(totalBalance, prevTotalBalance);

  const now = Date.now();
  const h24ago = now - 86_400_000;

  const recent = movements.filter(m => m.date >= h24ago);
  const prev24h = movements.filter(m => m.date >= h24ago - 86_400_000 && m.date < h24ago);

  const last24hIncome = recent.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const prev24hIncome = prev24h.filter(m => m.type === 'income').reduce((s, m) => s + m.amount, 0);
  const last24hIncomeChange = calcPercentChange(last24hIncome, prev24hIncome);

  const last24hExpense = recent.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const prev24hExpense = prev24h.filter(m => m.type === 'expense').reduce((s, m) => s + m.amount, 0);
  const last24hExpenseChange = calcPercentChange(last24hExpense, prev24hExpense);

  const addAccountFn = useCallback(async (data: Omit<Account, 'id'>) => {
    if (!user) return;
    await addAccount(user.uid, data);
  }, [user]);

  const updateAccountFn = useCallback(async (id: string, data: Partial<Account>) => {
    if (!user) return;
    await updateAccount(user.uid, id, data);
  }, [user]);

  const deleteAccountFn = useCallback(async (id: string) => {
    if (!user) return;
    await deleteAccount(user.uid, id);
  }, [user]);

  const addMovementFn = useCallback(async (data: Omit<Movement, 'id'>) => {
    if (!user) return;
    const account = accounts.find(a => a.id === data.accountId);
    if (!account) return;
    const prevBalance = account.balance;
    const newBalance = data.type === 'income'
      ? prevBalance + data.amount
      : prevBalance - data.amount;
    await addMovement(user.uid, data);
    await updateAccount(user.uid, data.accountId, {
      previousBalance: prevBalance,
      balance: newBalance,
    });
  }, [user, accounts]);

  const updateShortcutsFn = useCallback(async (data: Omit<Shortcut, 'id'>[]) => {
    if (!user) return;
    await saveShortcuts(user.uid, data);
  }, [user]);

  return (
    <AppContext.Provider value={{
      accounts, movements, shortcuts,
      totalBalance, balanceChange,
      last24hIncome, last24hIncomeChange,
      last24hExpense, last24hExpenseChange,
      addAccountFn, updateAccountFn, deleteAccountFn,
      addMovementFn, updateShortcutsFn,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
