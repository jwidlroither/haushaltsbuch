import { format, parseISO, isToday, isYesterday, isThisWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import type { Transaction } from '../types';

export function formatCurrency(amount: number, showSign = false): string {
  const formatted = new Intl.NumberFormat('de-AT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(Math.abs(amount));

  if (showSign && amount > 0) return `+${formatted}`;
  if (amount < 0) return `-${formatted}`;
  return formatted;
}

export function formatDate(dateStr: string, fmt = 'dd. MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt, { locale: de });
  } catch {
    return dateStr;
  }
}

export function formatMonth(month: number, year: number): string {
  const date = new Date(year, month - 1);
  return format(date, 'MMMM yyyy', { locale: de });
}

export function getMonthName(month: number): string {
  const date = new Date(2024, month - 1);
  return format(date, 'MMM', { locale: de });
}

export function clsx(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function currentMonth() {
  const now = new Date();
  return { month: now.getMonth() + 1, year: now.getFullYear() };
}

export interface TransactionGroup { label: string; items: Transaction[]; }

/** Gruppiert Transaktionen (bereits absteigend nach Datum sortiert) in relative Zeit-Buckets. */
export function groupTransactionsByDate(transactions: Transaction[]): TransactionGroup[] {
  const order = ['Heute', 'Gestern', 'Diese Woche', 'Älter'];
  const buckets: Record<string, Transaction[]> = { Heute: [], Gestern: [], 'Diese Woche': [], Älter: [] };

  for (const t of transactions) {
    const d = parseISO(t.date);
    if (isToday(d)) buckets['Heute'].push(t);
    else if (isYesterday(d)) buckets['Gestern'].push(t);
    else if (isThisWeek(d, { weekStartsOn: 1 })) buckets['Diese Woche'].push(t);
    else buckets['Älter'].push(t);
  }

  return order
    .map(label => ({ label, items: buckets[label] }))
    .filter(g => g.items.length > 0);
}
