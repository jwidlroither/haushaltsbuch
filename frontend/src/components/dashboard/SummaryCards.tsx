import type { Summary } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props { summary: Summary; }

export default function SummaryCards({ summary }: Props) {
  const cards = [
    {
      label: 'Einnahmen',
      value: summary.income,
      icon: '↓',
      colorClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/50',
      trend: null as string | null,
    },
    {
      label: 'Ausgaben',
      value: summary.expense,
      icon: '↑',
      colorClass: 'text-red-500 dark:text-red-400',
      bgClass: 'bg-red-50 dark:bg-red-950/50',
      trend: summary.pending > 0 ? `${formatCurrency(summary.pending)} ausstehend` : null,
    },
    {
      label: 'Saldo',
      value: summary.balance,
      icon: summary.balance >= 0 ? '▲' : '▼',
      colorClass: summary.balance >= 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-red-500 dark:text-red-400',
      bgClass: summary.balance >= 0
        ? 'bg-emerald-50 dark:bg-emerald-950/50'
        : 'bg-red-50 dark:bg-red-950/50',
      trend: null as string | null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card, i) => (
        <div
          key={card.label}
          className="card p-5 animate-on-mount"
          style={{ animationDelay: `${i * 0.05}s` }}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[var(--ink-faint)] uppercase tracking-widest">
              {card.label}
            </span>
            <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold ${card.colorClass} ${card.bgClass}`}>
              {card.icon}
            </span>
          </div>
          <div className={`font-mono text-2xl font-bold tabular-nums tracking-tight
            ${card.label === 'Saldo' ? card.colorClass : 'text-[var(--ink)]'}`}>
            {card.label === 'Saldo' && summary.balance > 0 ? '+' : ''}
            {formatCurrency(card.value)}
          </div>
          {card.trend && (
            <div className="text-xs text-amber-500 dark:text-amber-400 mt-1.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              {card.trend}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
