import type { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface PendingListProps {
  transactions: Transaction[];
  onMarkPaid: (id: string) => void;
  onEdit: (t: Transaction) => void;
}

export default function PendingList({ transactions, onMarkPaid, onEdit }: PendingListProps) {
  if (transactions.length === 0) return null;

  const total = transactions.reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="card animate-on-mount stagger-3">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <h3 className="font-display text-[var(--ink)]">Ausstehende Ausgaben</h3>
          <span className="badge bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
            {transactions.length}
          </span>
        </div>
        <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400">
          −{formatCurrency(total)}
        </span>
      </div>

      <div className="divide-y divide-[var(--border)]">
        {transactions.map((t, i) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-overlay)]
              transition-colors group animate-on-mount"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            {/* Mark-paid checkbox */}
            <button
              onClick={() => onMarkPaid(t.id)}
              title="Als bezahlt markieren"
              className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center
                shrink-0 hover:bg-amber-400 hover:border-amber-400 transition-all duration-150 group/btn"
            >
              <span className="w-2 h-2 rounded-full bg-transparent group-hover/btn:bg-white transition-all" />
            </button>

            {/* Icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
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
            <span className="font-mono text-sm font-semibold text-amber-600 dark:text-amber-400 tabular-nums shrink-0">
              −{formatCurrency(Number(t.amount))}
            </span>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-5 py-3 border-t border-[var(--border)] bg-amber-50/50 dark:bg-amber-900/10">
        <p className="text-xs text-amber-600 dark:text-amber-400">
          💡 Klicke den Kreis links um eine Ausgabe als bezahlt zu markieren
        </p>
      </div>
    </div>
  );
}
