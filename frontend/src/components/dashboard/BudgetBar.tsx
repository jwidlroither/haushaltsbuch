import type { BudgetOverview } from '../../types';
import { formatCurrency } from '../../utils/format';

interface BudgetBarProps {
  overview: BudgetOverview;
  onSetBudget: () => void;
}

export default function BudgetBar({ overview, onSetBudget }: BudgetBarProps) {
  const { totalBudget, budgetBase, paid, pending, available, paidPercent, pendingPercent } = overview;
  const hasBase = budgetBase > 0;

  const availableColor = available < 0
    ? 'text-[var(--danger)]'
    : available < budgetBase * 0.1
    ? 'text-amber-500'
    : 'text-[var(--success)]';

  return (
    <div className="card p-5 animate-on-mount">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-lg text-[var(--ink)]">Echtzeit-Budget</h2>
          <p className="text-xs text-[var(--ink-faint)] mt-0.5">
            {totalBudget > 0
              ? `Gesamtbudget: ${formatCurrency(totalBudget)}`
              : `Basis: Einnahmen ${formatCurrency(overview.totalIncome)}`}
          </p>
        </div>
        <button onClick={onSetBudget} className="btn-ghost text-xs px-3 py-1.5">
          {totalBudget > 0 ? '✎ Budget' : '+ Budget setzen'}
        </button>
      </div>

      {/* Big Available Number */}
      <div className="mb-5">
        <div className={`font-mono text-4xl font-bold tabular-nums ${availableColor}`}>
          {formatCurrency(available)}
        </div>
        <div className="text-xs text-[var(--ink-faint)] mt-1">
          frei verfügbar
          {pending > 0 && (
            <span className="ml-2 text-amber-500">
              · {formatCurrency(pending)} ausstehend eingerechnet
            </span>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {hasBase ? (
        <div className="space-y-2">
          <div className="flex h-3 rounded-full overflow-hidden bg-[var(--surface-overlay)] gap-0.5">
            {/* Paid */}
            <div
              className="h-full rounded-l-full transition-all duration-700 bg-[var(--danger)]"
              style={{ width: `${paidPercent}%` }}
              title={`Bezahlt: ${formatCurrency(paid)}`}
            />
            {/* Pending */}
            {pendingPercent > 0 && (
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${pendingPercent}%`,
                  background: 'repeating-linear-gradient(45deg,#f59e0b,#f59e0b 4px,#fbbf24 4px,#fbbf24 8px)',
                }}
                title={`Ausstehend: ${formatCurrency(pending)}`}
              />
            )}
          </div>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-[var(--ink-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--danger)] inline-block" />
              Bezahlt {formatCurrency(paid)} ({paidPercent}%)
            </span>
            {pending > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                Ausstehend {formatCurrency(pending)} ({pendingPercent}%)
              </span>
            )}
            <span className="flex items-center gap-1.5 ml-auto">
              <span className="w-2.5 h-2.5 rounded-sm bg-[var(--surface-overlay)] border border-[var(--border)] inline-block" />
              Verfügbar {formatCurrency(Math.max(0, available))}
            </span>
          </div>
        </div>
      ) : (
        <div className="text-xs text-[var(--ink-faint)] text-center py-2 border border-dashed border-[var(--border)] rounded-lg">
          Kein Budget und keine Einnahmen für diesen Monat erfasst.
          <button onClick={onSetBudget} className="text-[var(--accent)] hover:underline ml-1">
            Budget setzen
          </button>
        </div>
      )}
    </div>
  );
}
