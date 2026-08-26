import type { BudgetOverview } from '../../types';
import { formatCurrency } from '../../utils/format';
import RingProgress from '../ui/RingProgress';

interface BudgetBarProps {
  overview: BudgetOverview;
  onSetBudget: () => void;
}

/**
 * Hero-Bereich des Dashboards: großes verfügbares Guthaben mit
 * Fortschrittsring (Tacho-Optik) für den Budget-Verbrauch.
 */
export default function BudgetBar({ overview, onSetBudget }: BudgetBarProps) {
  const { totalBudget, budgetBase, paid, pending, available, usedPercent } = overview;
  const hasBase = budgetBase > 0;

  const status: 'ok' | 'warning' | 'danger' = available < 0
    ? 'danger'
    : usedPercent >= 80
    ? 'warning'
    : 'ok';

  const ringColor = { ok: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)' }[status];
  const amountColor = { ok: 'text-[var(--success)]', warning: 'text-[var(--warning)]', danger: 'text-[var(--danger)]' }[status];

  return (
    <div className="card p-6 animate-on-mount">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="font-display text-lg text-[var(--ink)]">Verfügbares Guthaben</h2>
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

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Ring gauge */}
        {hasBase ? (
          <RingProgress percent={usedPercent} size={168} strokeWidth={14} color={ringColor}>
            <div className="text-center px-2">
              <div className={`font-mono text-3xl font-bold tabular-nums leading-none ${amountColor}`}>
                {formatCurrency(available)}
              </div>
              <div className="text-[11px] text-[var(--ink-faint)] mt-1.5 uppercase tracking-wider">
                frei verfügbar
              </div>
            </div>
          </RingProgress>
        ) : (
          <div className={`font-mono text-4xl font-bold tabular-nums ${amountColor}`}>
            {formatCurrency(available)}
          </div>
        )}

        {/* Breakdown */}
        <div className="flex-1 w-full space-y-2.5">
          {hasBase ? (
            <>
              <Stat label="Budget genutzt" value={`${Math.round(usedPercent)}%`} color={ringColor} />
              <Stat label="Bezahlt" value={formatCurrency(paid)} color="var(--danger)" />
              {pending > 0 && <Stat label="Ausstehend" value={formatCurrency(pending)} color="var(--warning)" />}
              <Stat label="Verfügbar" value={formatCurrency(Math.max(0, available))} color="var(--success)" muted />
            </>
          ) : (
            <div className="text-xs text-[var(--ink-faint)] text-center sm:text-left py-2 border border-dashed border-[var(--border)] rounded-lg px-3">
              Kein Budget und keine Einnahmen für diesen Monat erfasst.
              <button onClick={onSetBudget} className="text-[var(--accent)] hover:underline ml-1">
                Budget setzen
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, muted }: { label: string; value: string; color: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="flex items-center gap-2 text-[var(--ink-muted)]">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color, opacity: muted ? 0.5 : 1 }} />
        {label}
      </span>
      <span className="font-mono font-semibold text-[var(--ink)] tabular-nums">{value}</span>
    </div>
  );
}
