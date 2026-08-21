import type { BudgetOverview } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getPayday } from '../ui/BudgetModal';

interface Props {
  overview: BudgetOverview;
  isCurrentMonth: boolean;
}

export default function DailyBudgetWidget({ overview, isCurrentMonth }: Props) {
  if (!isCurrentMonth) return null;

  const { available, budgetBase } = overview;
  if (budgetBase <= 0) return null;

  const now = new Date();
  const today = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const payday = getPayday();

  // Berechne wie viele Tage bis zum nächsten Gehalt
  let daysUntilPayday: number;
  let daysToCount: number;
  let afterPayday: boolean;

  if (today < payday) {
    // Noch vor dem Zahltag diesen Monat – Geld muss bis Zahltag reichen
    daysUntilPayday = payday - today;
    daysToCount = daysUntilPayday;
    afterPayday = false;
  } else {
    // Nach dem Zahltag – Geld reicht bis Ende des Monats
    daysUntilPayday = daysInMonth - today + payday; // nächster Zahltag nächsten Monat
    daysToCount = daysInMonth - today;
    afterPayday = true;
  }

  const dailyAllowed = daysToCount > 0 ? available / daysToCount : available;
  const avgPerDay = today > 0 ? (overview.paid + overview.pending) / today : 0;
  const daysAtThisRate = avgPerDay > 0 ? available / avgPerDay : 999;

  const isOver = available < 0;
  const isWarning = !isOver && (dailyAllowed < 5 || (!afterPayday && daysAtThisRate < daysUntilPayday));
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

  let label = '';
  let subText = '';

  if (isOver) {
    label = 'Budget überschritten';
    subText = `Du hast ${formatCurrency(Math.abs(available))} mehr ausgegeben als verfügbar.`;
  } else if (!afterPayday) {
    label = `Tagesbudget bis Zahltag (${payday}.)`;
    subText = `Noch ${daysUntilPayday} Tage bis zum Gehalt · ${formatCurrency(available)} müssen reichen`;
    if (avgPerDay > 0 && daysAtThisRate < daysUntilPayday) {
      subText = `⚠ Bei aktuellem Tempo reicht das Geld nur noch ~${Math.round(daysAtThisRate)} Tage – aber noch ${daysUntilPayday} bis zum Zahltag!`;
    }
  } else {
    label = 'Tagesbudget – heute darfst du noch ausgeben';
    subText = `${daysToCount} Tage bis Monatsende · ${formatCurrency(available)} gesamt verfügbar`;
  }

  return (
    <div className={`card p-5 border-2 animate-on-mount ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-widest ${labelClass}`}>
            {label}
          </p>
          <div className={`font-mono text-4xl font-bold tabular-nums mt-1 ${amountClass}`}>
            {isOver ? '-' : ''}{formatCurrency(Math.abs(dailyAllowed))}
          </div>
          <p className={`text-xs mt-2 ${labelClass} opacity-80`}>{subText}</p>
        </div>
        <div className={`text-3xl opacity-60`}>
          {isOver ? '⚠' : isWarning ? '!' : afterPayday ? '✓' : '📅'}
        </div>
      </div>
    </div>
  );
}
