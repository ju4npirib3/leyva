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
  balance: number;          // For credit: current debt (0 = no debt)
  previousBalance: number;
  color: string;
  currency: string;
  createdAt: number;
  // Credit card only
  creditLimit?: number;
  cutoffDay?: number;
  paymentDueDay?: number;
  // Savings account only
  interestRate?: number;      // Annual interest rate as % (e.g. 8.5 = 8.5%)
  termMonths?: number;        // Term duration in months
  interestStartDate?: number; // Timestamp when interest started accruing
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
  establishment?: string;   // Optional merchant / store name
  date: number;
  createdAt: number;
  msiPlanId?: string;       // links this movement to an MSI plan
}

export interface MsiPlan {
  id: string;
  accountId: string;
  accountName: string;
  description: string;
  totalAmount: number;
  months: number;
  monthlyPayment: number;   // = totalAmount / months
  startDate: number;        // timestamp of the purchase date
  movementId: string;       // the expense movement that was created
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

export interface CustomCategory {
  id: string;
  name: string;
  icon: string;
  type: 'income' | 'expense';
}
