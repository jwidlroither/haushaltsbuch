import type { Summary } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props { summary: Summary; }

export default function SummaryCards({ summary }: Props) {
  const cards = [
    {
      label: 'Einnahmen', value: summary.income,
      icon: '↓', color: 'var(--success)', bg: '#22c55e15', delay: '0s',
      sub: null,
    },
    {
      label: 'Ausgaben', value: summary.expense,
      icon: '↑', color: 'var(--danger)', bg: '#ef444415', delay: '0.05s',
      sub: summary.pending > 0
        ? `davon ${formatCurrency(summary.pending)} ausstehend`
        : null,
    },
    {
      label: 'Saldo', value: summary.balance,
      icon: '◈',
      color: summary.balance >= 0 ? 'var(--success)' : 'var(--danger)',
      bg: summary.balance >= 0 ? '#22c55e15' : '#ef444415',
      delay: '0.1s',
      sub: null,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(card => (
        <div key={card.label} className="card p-5 animate-on-mount" style={{ animationDelay: card.delay }}>
          <div className="flex items-start justify-between mb-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold"
              style={{ background: card.bg, color: card.color }}>
              {card.icon}
            </div>
            <span className="text-xs text-[var(--ink-faint)] uppercase tracking-wider">{card.label}</span>
          </div>
          <div className="font-mono text-2xl font-semibold tabular-nums"
            style={{ color: card.label === 'Saldo' ? card.color : 'var(--ink)' }}>
            {card.label === 'Saldo' && summary.balance > 0 ? '+' : ''}
            {formatCurrency(card.value)}
          </div>
          {card.sub && (
            <div className="text-xs text-amber-500 mt-1">{card.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
