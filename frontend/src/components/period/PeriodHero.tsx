import type { PeriodOverview } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface Props {
  overview: PeriodOverview;
}

const SEGMENTS: { key: 'fixedCosts' | 'debts' | 'expenses'; label: string; color: string }[] = [
  { key: 'fixedCosts', label: 'Fixkosten',     color: 'bg-indigo-500' },
  { key: 'debts',      label: 'Rückzahlungen', color: 'bg-amber-500' },
  { key: 'expenses',   label: 'Ausgaben',      color: 'bg-rose-500' },
];

/** Hero-Bereich: "Frei verfügbar" groß, darunter ein Balken mit den vier Anteilen
 *  (Fixkosten/Rückzahlungen/Ausgaben/Rest) – wie im Excel, aber berechnet statt getippt. */
export default function PeriodHero({ overview }: Props) {
  const { period, income, available, fixedCosts, debts, expenses } = overview;
  const committed = fixedCosts.planned + debts.planned + expenses.planned;
  const base = income > 0 ? income : committed; // falls noch kein Einkommen erfasst ist
  const isOver = available < 0;

  const segments = SEGMENTS.map(s => ({
    ...s,
    amount: overview[s.key].planned,
    percent: base > 0 ? Math.min(100, (overview[s.key].planned / base) * 100) : 0,
  }));
  const restPercent = base > 0 ? Math.max(0, 100 - segments.reduce((a, s) => a + s.percent, 0)) : 0;

  return (
    <div className="card p-6 animate-on-mount">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-faint)]">
            Frei verfügbar · {formatDate(period.start, 'dd.MM.')}–{formatDate(period.end, 'dd.MM.yyyy')}
          </p>
          <div className={`font-mono text-5xl font-bold tabular-nums mt-1 ${isOver ? 'text-[var(--danger)]' : 'text-[var(--ink)]'}`}>
            {isOver ? '-' : ''}{formatCurrency(Math.abs(available))}
          </div>
        </div>
        <div className="text-right text-xs text-[var(--ink-muted)] space-y-0.5">
          <div>Einkommen: <span className="font-mono text-[var(--ink)]">{formatCurrency(income)}</span></div>
          {overview.payday === null && (
            <div className="text-[var(--warning)]">Kein Zahltag gesetzt – Zeitraum = Kalendermonat</div>
          )}
        </div>
      </div>

      {/* Balken mit den vier Anteilen */}
      <div className="mt-5 h-3 rounded-full bg-[var(--surface-overlay)] overflow-hidden flex">
        {segments.map(s => (
          <div key={s.key} className={s.color} style={{ width: `${s.percent}%` }} title={`${s.label}: ${formatCurrency(s.amount)}`} />
        ))}
        {restPercent > 0 && <div className="bg-[var(--success)]" style={{ width: `${restPercent}%` }} title={`Frei: ${formatCurrency(available)}`} />}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--ink-muted)]">
        {segments.map(s => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            {s.label}: {formatCurrency(s.amount)}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
          Frei: {formatCurrency(available)}
        </span>
      </div>
    </div>
  );
}
