export interface AppUser {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
}

export type AccountType = 'checking' | 'savings' | 'cash' | 'investment' | 'credit';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  previousBalance: number;
  color: string;
  currency: string;
  createdAt: number;
}

export type MovementType = 'income' | 'expense' | 'transfer';

export interface Movement {
  id: string;
  accountId: string;
  accountName: string;
  type: MovementType;
  amount: number;
  category: string;
  description: string;
  date: number;
  createdAt: number;
}

export interface Shortcut {
  id: string;
  label: string;
  icon: string;
  type: MovementType;
  category: string;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  currency: string;
  language: string;
}
