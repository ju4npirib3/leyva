'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  subscribeAccounts, subscribeMovements, subscribeShortcuts,
  addAccount, updateAccount, deleteAccount, addMovement, deleteMovement, saveShortcuts,
  subscribeCategories, saveCategory, saveAllCategories, migrateAllAccountsToCurrency,
  subscribeMsiPlans, addMsiPlan, deleteMsiPlan, editMovement,
  subscribeAccountOrder, saveAccountOrder,
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
  updateMovementFn: (old: Movement, updates: Partial<Omit<Movement, 'id'>>) => Promise<void>;
  reorderAccountsFn: (ids: string[]) => Promise<void>;
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
  const [rawAccounts, setRawAccounts] = useState<Account[]>([]);
  const [accountOrder, setAccountOrder] = useState<string[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [msiPlans, setMsiPlans] = useState<MsiPlan[]>([]);

  useEffect(() => {
    if (!user) { setRawAccounts([]); setAccountOrder([]); setMovements([]); setShortcuts([]); setCustomCats([]); setMsiPlans([]); return; }

    // One-shot migration: write MXN to Firestore for any non-MXN account
    migrateAllAccountsToCurrency(user.uid, 'MXN').catch(() => {});

    const unsub1 = subscribeAccounts(user.uid, (loaded) => {
      setRawAccounts(loaded.map(a => ({ ...a, currency: 'MXN' })));
    });
    const unsub2 = subscribeMovements(user.uid, setMovements);
    const unsub3 = subscribeShortcuts(user.uid, (s) => {
      setShortcuts(s.length > 0 ? s : DEFAULT_SHORTCUTS.map((d, i) => ({ ...d, id: String(i) })));
    });
    const unsub4 = subscribeCategories(user.uid, setCustomCats);
    const unsub5 = subscribeMsiPlans(user.uid, setMsiPlans);
    const unsub6 = subscribeAccountOrder(user.uid, setAccountOrder);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); };
  }, [user]);

  // Sort accounts by custom order; new accounts (not in order) go to the end
  const accounts = useMemo(() => {
    if (accountOrder.length === 0) return rawAccounts;
    const idx = new Map(accountOrder.map((id, i) => [id, i]));
    return [...rawAccounts].sort((a, b) => (idx.get(a.id) ?? 999) - (idx.get(b.id) ?? 999));
  }, [rawAccounts, accountOrder]);

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

  // Credit card balances are liabilities — subtract them from net total
  const totalBalance = accounts.reduce((s, a) => a.type === 'credit' ? s - a.balance : s + a.balance, 0);
  const prevTotalBalance = accounts.reduce((s, a) => a.type === 'credit' ? s - a.previousBalance : s + a.previousBalance, 0);
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

  const reorderAccountsFn = useCallback(async (ids: string[]) => {
    if (!user) return;
    await saveAccountOrder(user.uid, ids);
  }, [user]);

  const updateMovementFn = useCallback(async (old: Movement, updates: Partial<Omit<Movement, 'id'>>) => {
    if (!user) return;
    await editMovement(user.uid, old.id, updates);
    const amountChanged = updates.amount !== undefined && updates.amount !== old.amount;
    const typeChanged = updates.type !== undefined && updates.type !== old.type;
    if (amountChanged || typeChanged) {
      const account = accounts.find(a => a.id === old.accountId);
      if (account) {
        const isCredit = account.type === 'credit';
        const oldAmt = old.amount;
        const newAmt = updates.amount ?? old.amount;
        const oldType = old.type;
        const newType = updates.type ?? old.type;
        const oldEffect = isCredit ? (oldType === 'expense' ? oldAmt : -oldAmt) : (oldType === 'income' ? oldAmt : -oldAmt);
        const newEffect = isCredit ? (newType === 'expense' ? newAmt : -newAmt) : (newType === 'income' ? newAmt : -newAmt);
        await updateAccount(user.uid, old.accountId, {
          previousBalance: account.balance,
          balance: account.balance - oldEffect + newEffect,
        });
      }
    }
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
      addMovementFn, updateMovementFn, deleteMovementFn, updateShortcutsFn, reorderAccountsFn,
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
