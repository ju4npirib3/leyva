import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 0 && h < 12) return 'Buenos días';
  if (h >= 12 && h < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function calcPercentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export const ACCOUNT_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#3B82F6', '#14B8A6', '#EF4444',
];

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  checking: 'Corriente',
  savings: 'Ahorros',
  cash: 'Efectivo',
  investment: 'Inversión',
  credit: 'Crédito',
};

export const INCOME_CATEGORIES = [
  'Salario', 'Freelance', 'Inversión', 'Negocio', 'Regalo', 'Reembolso', 'Otros',
];

export const EXPENSE_CATEGORIES = [
  'Comida', 'Transporte', 'Entretenimiento', 'Salud', 'Ropa',
  'Servicios', 'Educación', 'Viajes', 'Hogar', 'Tecnología', 'Otros',
];

export const CATEGORY_ICONS: Record<string, string> = {
  Salario: '💼', Freelance: '💻', Inversión: '📈', Negocio: '🏢',
  Regalo: '🎁', Reembolso: '↩️', Comida: '🍔', Transporte: '🚗',
  Entretenimiento: '🎮', Salud: '🏥', Ropa: '👗', Servicios: '⚡',
  Educación: '📚', Viajes: '✈️', Hogar: '🏠', Tecnología: '📱', Otros: '📦',
};

export const DEFAULT_SHORTCUTS = [
  { label: 'Gasto', icon: '💸', type: 'expense' as const, category: 'Otros' },
  { label: 'Ingreso', icon: '💰', type: 'income' as const, category: 'Otros' },
  { label: 'Comida', icon: '🍔', type: 'expense' as const, category: 'Comida' },
  { label: 'Transporte', icon: '🚗', type: 'expense' as const, category: 'Transporte' },
];
