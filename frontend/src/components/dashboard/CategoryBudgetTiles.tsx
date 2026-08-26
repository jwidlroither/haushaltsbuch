import type { BudgetOverview } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props {
  overview: BudgetOverview;
  isCurrentMonth: boolean;
}

/**
 * Kompakte Kategorie-Budget-Kacheln mit Fortschrittsbalken, verbleibenden
 * Tagen im Monat und Warnung ab 80% Verbrauch.
 */
export default function CategoryBudgetTiles({ overview, isCurrentMonth }: Props) {
  const { categoryBudgets, byCategory } = overview;
  const perCategory = categoryBudgets.filter(b => b.category_id);
  if (perCategory.length === 0) return null;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = isCurrentMonth ? daysInMonth - now.getDate() + 1 : daysInMonth;

  return (
    <div className="animate-on-mount stagger-1">
      <h3 className="font-display text-sm text-[var(--ink-muted)] mb-2.5 px-0.5">Budgets nach Kategorie</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {perCategory.map(budget => {
          const spent = byCategory
            .filter(c => c.category_id === budget.category_id)
            .reduce((s, c) => s + Number(c.total), 0);
          const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
          const over = pct >= 100;
          const warn = pct >= 80 && pct < 100;
          const barColor = over ? 'var(--danger)' : warn ? 'var(--warning)' : 'var(--accent)';

          return (
            <div key={budget.id}
              className={`card p-3.5 ${over ? 'border-[var(--danger)]' : warn ? 'border-[var(--warning)]' : ''}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: `${budget.category_color}22` }}>
                  {budget.category_icon}
                </div>
                <span className="text-xs font-medium text-[var(--ink)] truncate flex-1">
                  {budget.category_name}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--surface-overlay)] overflow-hidden mb-1.5">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(100, pct)}%`, background: barColor }} />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-mono text-[var(--ink-muted)]">
                  {formatCurrency(spent)} / {formatCurrency(budget.amount)}
                </span>
                <span className="font-mono font-semibold" style={{ color: barColor }}>
                  {Math.round(pct)}%
                </span>
              </div>
              {(over || warn) && (
                <p className={`text-[10px] mt-1.5 ${over ? 'text-[var(--danger)]' : 'text-[var(--warning)]'}`}>
                  {over ? '⚠ Budget überschritten' : '! Fast aufgebraucht'}
                </p>
              )}
              {isCurrentMonth && !over && (
                <p className="text-[10px] text-[var(--ink-faint)] mt-1">
                  noch {remainingDays} {remainingDays === 1 ? 'Tag' : 'Tage'} im Monat
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
