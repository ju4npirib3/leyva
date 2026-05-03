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
  addTransferFn: (fromAccountId: string, toAccountId: string, amount: number, description: string, date: number) => Promise<void>;
  updateShortcutsFn: (shortcuts: Omit<Shortcut, 'id'>[]) => Promise<void>;
  saveCategoryFn: (cat: CustomCategory) => Promise<void>;
  saveAllCategoriesFn: (cats: CustomCategory[]) => Promise<void>;
  addMsiPlanFn: (movementData: Omit<Movement, 'id'>, months: number) => Promise<void>;
  deleteMsiPlanFn: (planId: string, movementId: string, accountId: string, amount: number) => Promise<void>;
  payCardFn: (creditAccountId: string, sourceAccountId: string, amount: number) => Promise<void>;
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

    const accountChanged = updates.accountId !== undefined && updates.accountId !== old.accountId;
    const amountChanged = updates.amount !== undefined && updates.amount !== old.amount;
    const typeChanged = updates.type !== undefined && updates.type !== old.type;

    if (accountChanged) {
      const newAccount = accounts.find(a => a.id === updates.accountId);
      if (newAccount) updates.accountName = newAccount.name;
    }

    await editMovement(user.uid, old.id, updates);

    if (accountChanged) {
      const oldAccount = accounts.find(a => a.id === old.accountId);
      const newAccount = accounts.find(a => a.id === updates.accountId);
      const amount = updates.amount ?? old.amount;
      const type = updates.type ?? old.type;

      if (oldAccount) {
        const isCredit = oldAccount.type === 'credit';
        const oldEffect = isCredit ? (old.type === 'expense' ? old.amount : -old.amount) : (old.type === 'income' ? old.amount : -old.amount);
        await updateAccount(user.uid, old.accountId, {
          previousBalance: oldAccount.balance,
          balance: oldAccount.balance - oldEffect,
        });
      }
      if (newAccount) {
        const isCredit = newAccount.type === 'credit';
        const newEffect = isCredit ? (type === 'expense' ? amount : -amount) : (type === 'income' ? amount : -amount);
        await updateAccount(user.uid, updates.accountId!, {
          previousBalance: newAccount.balance,
          balance: newAccount.balance + newEffect,
        });
      }
    } else if (amountChanged || typeChanged) {
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
    const movToDelete = movements.find(m => m.id === id);

    // If this is a transfer leg, also delete & reverse the paired leg
    if (movToDelete?.transferPairId) {
      const paired = movements.find(m => m.transferPairId === movToDelete.transferPairId && m.id !== id);
      if (paired) {
        const pairedAccount = accounts.find(a => a.id === paired.accountId);
        await deleteMovement(user.uid, paired.id);
        if (pairedAccount) {
          const pairedIsCredit = pairedAccount.type === 'credit';
          // Reverse the "in" effect: non-credit was increased → decrease; credit was decreased → increase
          const newPairedBalance = pairedIsCredit
            ? pairedAccount.balance + paired.amount
            : pairedAccount.balance - paired.amount;
          await updateAccount(user.uid, paired.accountId, {
            previousBalance: pairedAccount.balance,
            balance: Math.max(0, newPairedBalance),
          });
        }
      }
    }

    await deleteMovement(user.uid, id);
    if (account) {
      const isCredit = account.type === 'credit';
      let newBalance: number;
      if (movToDelete?.transferDirection === 'out') {
        // Reverse "out": non-credit was decreased → increase back; credit was increased (cash advance) → decrease
        newBalance = isCredit
          ? Math.max(0, account.balance - amount)
          : account.balance + amount;
      } else if (movToDelete?.transferDirection === 'in') {
        // Reverse "in": non-credit was increased → decrease back; credit was decreased → increase
        newBalance = isCredit
          ? account.balance + amount
          : account.balance - amount;
      } else {
        // Regular movement: reverse original effect
        newBalance = isCredit
          ? (type === 'expense' ? Math.max(0, account.balance - amount) : account.balance + amount)
          : (type === 'income' ? account.balance - amount : account.balance + amount);
      }
      await updateAccount(user.uid, accountId, {
        previousBalance: account.balance,
        balance: newBalance,
      });
    }
  }, [user, accounts, movements]);

  const addTransferFn = useCallback(async (
    fromAccountId: string,
    toAccountId: string,
    amount: number,
    description: string,
    date: number,
  ) => {
    if (!user) return;
    const fromAccount = accounts.find(a => a.id === fromAccountId);
    const toAccount = accounts.find(a => a.id === toAccountId);
    if (!fromAccount || !toAccount) return;

    const pairId = `tr_${Date.now()}`;
    const now = Date.now();
    const desc = description.trim() || `Traspaso ${fromAccount.name} → ${toAccount.name}`;

    await addMovement(user.uid, {
      accountId: fromAccountId,
      accountName: fromAccount.name,
      type: 'transfer',
      amount,
      category: 'Traspaso',
      description: `${desc} (salida)`,
      date,
      createdAt: now,
      transferPairId: pairId,
      transferDirection: 'out',
      transferLinkedAccountId: toAccountId,
      transferLinkedAccountName: toAccount.name,
    });

    await addMovement(user.uid, {
      accountId: toAccountId,
      accountName: toAccount.name,
      type: 'transfer',
      amount,
      category: 'Traspaso',
      description: `${desc} (entrada)`,
      date,
      createdAt: now,
      transferPairId: pairId,
      transferDirection: 'in',
      transferLinkedAccountId: fromAccountId,
      transferLinkedAccountName: fromAccount.name,
    });

    // Source: non-credit loses balance; credit gains debt (cash advance)
    const fromIsCredit = fromAccount.type === 'credit';
    const newFromBalance = fromIsCredit
      ? fromAccount.balance + amount
      : fromAccount.balance - amount;
    await updateAccount(user.uid, fromAccountId, {
      previousBalance: fromAccount.balance,
      balance: Math.max(0, newFromBalance),
    });

    // Destination: non-credit gains balance; credit reduces debt
    const toIsCredit = toAccount.type === 'credit';
    const newToBalance = toIsCredit
      ? Math.max(0, toAccount.balance - amount)
      : toAccount.balance + amount;
    await updateAccount(user.uid, toAccountId, {
      previousBalance: toAccount.balance,
      balance: newToBalance,
    });
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

  const payCardFn = useCallback(async (
    creditAccountId: string,
    sourceAccountId: string,
    amount: number,
  ) => {
    if (!user) return;
    const creditAccount = accounts.find(a => a.id === creditAccountId);
    const sourceAccount = accounts.find(a => a.id === sourceAccountId);
    if (!creditAccount || !sourceAccount) return;
    const now = Date.now();
    const desc = `Pago tarjeta ${creditAccount.name}`;
    await addMovement(user.uid, {
      accountId: creditAccountId,
      accountName: creditAccount.name,
      type: 'income',
      amount,
      category: 'Pago de tarjeta',
      description: desc,
      date: now,
      createdAt: now,
    });
    await addMovement(user.uid, {
      accountId: sourceAccountId,
      accountName: sourceAccount.name,
      type: 'expense',
      amount,
      category: 'Pago de tarjeta',
      description: desc,
      date: now,
      createdAt: now,
    });
    await updateAccount(user.uid, creditAccountId, {
      previousBalance: creditAccount.balance,
      balance: Math.max(0, creditAccount.balance - amount),
    });
    await updateAccount(user.uid, sourceAccountId, {
      previousBalance: sourceAccount.balance,
      balance: sourceAccount.balance - amount,
    });
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
      addMovementFn, updateMovementFn, deleteMovementFn, addTransferFn, updateShortcutsFn, reorderAccountsFn,
      saveCategoryFn, saveAllCategoriesFn,
      addMsiPlanFn, deleteMsiPlanFn, payCardFn,
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
