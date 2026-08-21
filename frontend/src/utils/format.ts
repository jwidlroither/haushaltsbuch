import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

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
