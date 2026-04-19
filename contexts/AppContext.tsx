'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeAccounts, subscribeMovements, subscribeShortcuts,
  addAccount, updateAccount, deleteAccount, addMovement, deleteMovement, saveShortcuts,
  subscribeCategories, saveCategory, saveAllCategories, migrateAllAccountsToCurrency,
  subscribeMsiPlans, addMsiPlan, deleteMsiPlan,
} from '@/lib/firestore';
import { DEFAULT_SHORTCUTS, DEFAULT_EXPENSE_CATS, DEFAULT_INCOME_CATS, calcPercentChange } from '@/lib/utils';
import type { Account, Movement, Shortcut, CustomCategory, MsiPlan } from '@/types';

interface AppContextValue {
  accounts: Account[];
  movements: Movement[];
  shortcuts: Shortcut[];
  expenseCategories: CustomCategory[];
  incomeCategories: CustomCategory[];
  msiPlans: MsiPlan[];
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
  deleteMovementFn: (id: string, accountId: string, type: string, amount: number) => Promise<void>;
  updateShortcutsFn: (shortcuts: Omit<Shortcut, 'id'>[]) => Promise<void>;
  saveCategoryFn: (cat: CustomCategory) => Promise<void>;
  saveAllCategoriesFn: (cats: CustomCategory[]) => Promise<void>;
  addMsiPlanFn: (movementData: Omit<Movement, 'id'>, months: number) => Promise<void>;
  deleteMsiPlanFn: (planId: string, movementId: string, accountId: string, amount: number) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [msiPlans, setMsiPlans] = useState<MsiPlan[]>([]);

  useEffect(() => {
    if (!user) { setAccounts([]); setMovements([]); setShortcuts([]); setCustomCats([]); setMsiPlans([]); return; }

    // One-shot migration: write MXN to Firestore for any non-MXN account
    migrateAllAccountsToCurrency(user.uid, 'MXN').catch(() => {});

    const unsub1 = subscribeAccounts(user.uid, (loaded) => {
      // Always display MXN regardless of what Firestore returns during migration
      setAccounts(loaded.map(a => ({ ...a, currency: 'MXN' })));
    });
    const unsub2 = subscribeMovements(user.uid, setMovements);
    const unsub3 = subscribeShortcuts(user.uid, (s) => {
      setShortcuts(s.length > 0 ? s : DEFAULT_SHORTCUTS.map((d, i) => ({ ...d, id: String(i) })));
    });
    const unsub4 = subscribeCategories(user.uid, setCustomCats);
    const unsub5 = subscribeMsiPlans(user.uid, setMsiPlans);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); };
  }, [user]);

  // Merge Firestore custom categories with defaults (Firestore wins on conflict by id)
  const expenseCategories: CustomCategory[] = (() => {
    if (customCats.filter(c => c.type === 'expense').length === 0) {
      return DEFAULT_EXPENSE_CATS.map(c => ({ ...c, type: 'expense' as const }));
    }
    return customCats.filter(c => c.type === 'expense');
  })();

  const incomeCategories: CustomCategory[] = (() => {
    if (customCats.filter(c => c.type === 'income').length === 0) {
      return DEFAULT_INCOME_CATS.map(c => ({ ...c, type: 'income' as const }));
    }
    return customCats.filter(c => c.type === 'income');
  })();

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
    // Credit cards: expenses ADD to debt, payments REDUCE debt
    const isCredit = account.type === 'credit';
    const newBalance = isCredit
      ? (data.type === 'expense'
          ? prevBalance + data.amount
          : Math.max(0, prevBalance - data.amount))
      : (data.type === 'income'
          ? prevBalance + data.amount
          : prevBalance - data.amount);
    await addMovement(user.uid, data);
    await updateAccount(user.uid, data.accountId, {
      previousBalance: prevBalance,
      balance: newBalance,
    });
  }, [user, accounts]);

  const deleteMovementFn = useCallback(async (id: string, accountId: string, type: string, amount: number) => {
    if (!user) return;
    const account = accounts.find(a => a.id === accountId);
    await deleteMovement(user.uid, id);
    if (account) {
      const isCredit = account.type === 'credit';
      // Reverse of add: credit expense was added, so subtract; credit income was subtracted, so add
      const newBalance = isCredit
        ? (type === 'expense'
            ? Math.max(0, account.balance - amount)
            : account.balance + amount)
        : (type === 'income'
            ? account.balance - amount
            : account.balance + amount);
      await updateAccount(user.uid, accountId, {
        previousBalance: account.balance,
        balance: newBalance,
      });
    }
  }, [user, accounts]);

  const updateShortcutsFn = useCallback(async (data: Omit<Shortcut, 'id'>[]) => {
    if (!user) return;
    await saveShortcuts(user.uid, data);
  }, [user]);

  const saveCategoryFn = useCallback(async (cat: CustomCategory) => {
    if (!user) return;
    // If we're saving the first custom category, seed all defaults first
    const allCats = customCats.length === 0
      ? [
          ...DEFAULT_EXPENSE_CATS.map(c => ({ ...c, type: 'expense' as const })),
          ...DEFAULT_INCOME_CATS.map(c => ({ ...c, type: 'income' as const })),
        ]
      : customCats;
    const merged = allCats.map(c => c.id === cat.id ? cat : c);
    const hasNew = !merged.some(c => c.id === cat.id);
    await saveAllCategories(user.uid, hasNew ? [...merged, cat] : merged);
  }, [user, customCats]);

  const saveAllCategoriesFn = useCallback(async (cats: CustomCategory[]) => {
    if (!user) return;
    await saveAllCategories(user.uid, cats);
  }, [user]);

  const addMsiPlanFn = useCallback(async (movementData: Omit<Movement, 'id'>, months: number) => {
    if (!user) return;
    const account = accounts.find(a => a.id === movementData.accountId);
    if (!account) return;
    const prevBalance = account.balance;
    const newBalance = prevBalance + movementData.amount; // credit card expense adds to debt
    const movementId = await addMovement(user.uid, movementData);
    await updateAccount(user.uid, movementData.accountId, {
      previousBalance: prevBalance,
      balance: newBalance,
    });
    await addMsiPlan(user.uid, {
      accountId: movementData.accountId,
      accountName: movementData.accountName,
      description: movementData.description,
      totalAmount: movementData.amount,
      months,
      monthlyPayment: movementData.amount / months,
      startDate: movementData.date,
      movementId,
      createdAt: Date.now(),
    });
  }, [user, accounts]);

  const deleteMsiPlanFn = useCallback(async (planId: string, movementId: string, accountId: string, amount: number) => {
    if (!user) return;
    const account = accounts.find(a => a.id === accountId);
    await deleteMovement(user.uid, movementId);
    if (account) {
      // Reverse credit card expense: subtract amount from debt
      await updateAccount(user.uid, accountId, {
        previousBalance: account.balance,
        balance: Math.max(0, account.balance - amount),
      });
    }
    await deleteMsiPlan(user.uid, planId);
  }, [user, accounts]);

  return (
    <AppContext.Provider value={{
      accounts, movements, shortcuts,
      expenseCategories, incomeCategories,
      msiPlans,
      totalBalance, balanceChange,
      last24hIncome, last24hIncomeChange,
      last24hExpense, last24hExpenseChange,
      addAccountFn, updateAccountFn, deleteAccountFn,
      addMovementFn, deleteMovementFn, updateShortcutsFn,
      saveCategoryFn, saveAllCategoriesFn,
      addMsiPlanFn, deleteMsiPlanFn,
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
