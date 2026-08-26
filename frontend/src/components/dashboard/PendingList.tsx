import type { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface PendingListProps {
  transactions: Transaction[];
  onMarkPaid: (id: string) => void;
  onEdit: (t: Transaction) => void;
}

/**
 * Ausstehende Ausgaben als prominente "Action Items" – jede Karte lädt
 * direkt zum Abhaken ein statt in einer schlichten Liste zu verschwinden.
 */
export default function PendingList({ transactions, onMarkPaid, onEdit }: PendingListProps) {
  if (transactions.length === 0) return null;

  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="animate-on-mount stagger-3">
      <div className="flex items-center justify-between mb-2.5 px-0.5">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse" />
          <h3 className="font-display text-sm text-[var(--ink-muted)]">Ausstehende Ausgaben</h3>
          <span className="badge text-[var(--warning)]" style={{ background: 'color-mix(in srgb, var(--warning) 15%, transparent)' }}>
            {transactions.length}
          </span>
        </div>
        <span className="font-mono text-sm font-semibold text-[var(--warning)]">
          −{formatCurrency(total)}
        </span>
      </div>

      <div className="space-y-2">
        {transactions.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-3 p-4 rounded-[var(--radius)] border-2
              hover:border-[var(--warning)] transition-all duration-150 animate-on-mount"
            style={{
              animationDelay: `${i * 0.04}s`,
              borderColor: 'color-mix(in srgb, var(--warning) 35%, transparent)',
              background: 'color-mix(in srgb, var(--warning) 6%, var(--surface))',
            }}
          >
            {/* Icon */}
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
              style={{ background: t.category_color ? `${t.category_color}22` : 'var(--surface-overlay)' }}
            >
              {t.category_icon || '📦'}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(t)}>
              <div className="text-sm font-medium text-[var(--ink)] truncate">
                {t.description || t.category_name || '—'}
              </div>
              <div className="text-xs text-[var(--ink-faint)]">
                {t.category_name && t.description ? `${t.category_name} · ` : ''}
                {formatDate(t.date)}
              </div>
            </div>

            {/* Amount */}
            <span className="font-mono text-sm font-semibold text-[var(--warning)] tabular-nums shrink-0">
              −{formatCurrency(Number(t.amount))}
            </span>

            {/* Quick action */}
            <button
              onClick={() => onMarkPaid(t.id)}
              className="shrink-0 px-3 py-2 rounded-lg text-xs font-semibold
                bg-[var(--warning)] text-white hover:brightness-110 active:scale-95
                transition-all duration-150 whitespace-nowrap"
            >
              ✓ Bezahlt
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
