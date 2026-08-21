import type { BudgetOverview } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props {
  overview: BudgetOverview;
  isCurrentMonth: boolean;
}

export default function DailyBudgetWidget({ overview, isCurrentMonth }: Props) {
  if (!isCurrentMonth) return null;

  const { available, budgetBase } = overview;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  if (budgetBase <= 0) return null;

  const dailyAllowed = daysLeft > 0 ? available / daysLeft : available;
  const avgPerDay = dayOfMonth > 0 ? overview.paid / dayOfMonth : 0;
  const daysAtThisRate = avgPerDay > 0 ? available / avgPerDay : 999;
  const pctUsed = budgetBase > 0 ? (overview.paid / budgetBase) * 100 : 0;

  const isOver = available < 0;
  const isWarning = !isOver && (pctUsed >= 80 || daysAtThisRate < daysLeft);
  const isOk = !isOver && !isWarning;

  const colorClass = isOver
    ? 'border-[var(--danger)] bg-red-50 dark:bg-red-950/30'
    : isWarning
    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
    : 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30';

  const amountClass = isOver
    ? 'text-[var(--danger)]'
    : isWarning
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-emerald-600 dark:text-emerald-400';

  const labelClass = isOver
    ? 'text-red-700 dark:text-red-300'
    : isWarning
    ? 'text-amber-700 dark:text-amber-300'
    : 'text-emerald-700 dark:text-emerald-300';

  let subText = '';
  if (isOver) {
    subText = `Budget überschritten um ${formatCurrency(Math.abs(available))}`;
  } else {
    subText = `${daysLeft} Tage bis Monatsende · ${formatCurrency(Math.max(0, available))} gesamt verfügbar`;
    if (avgPerDay > 0 && daysAtThisRate < daysLeft + 3) {
      subText = `⚠ Bei aktuellem Tempo (${formatCurrency(avgPerDay)}/Tag) reicht das Geld noch ~${Math.round(daysAtThisRate)} Tage`;
    }
  }

  return (
    <div className={`card p-5 border-2 animate-on-mount ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${labelClass}`}>
            {isOk ? 'Tagesbudget – du darfst heute noch ausgeben' : isWarning ? 'Achtung – Tagesbudget' : 'Budget überschritten'}
          </p>
          <div className={`font-mono text-4xl font-bold tabular-nums mt-1 ${amountClass}`}>
            {isOver ? '-' : ''}{formatCurrency(Math.abs(dailyAllowed))}
          </div>
          <p className={`text-xs mt-2 ${labelClass} opacity-80`}>{subText}</p>
        </div>
        <div className={`text-3xl opacity-60`}>
          {isOver ? '⚠' : isWarning ? '!' : '✓'}
        </div>
      </div>
    </div>
  );
}
