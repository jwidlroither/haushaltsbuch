import type { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface Props {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onMarkPaid?: (id: string) => void;
  index?: number;
}

export default function TransactionItem({ transaction: t, onEdit, onDelete, onMarkPaid, index = 0 }: Props) {
  const isPending = t.type === 'expense' && t.status === 'ausstehend';

  return (
    <div
      className={`group flex items-center gap-3 p-3.5 hover:bg-[var(--surface-overlay)]
        rounded-[var(--radius-sm)] transition-all duration-150 animate-on-mount
        ${isPending ? 'border-l-2 border-amber-400 pl-3' : ''}`}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Pending pay button */}
      {isPending && onMarkPaid ? (
        <button
          onClick={() => onMarkPaid(t.id)}
          title="Als bezahlt markieren"
          className="w-5 h-5 rounded-full border-2 border-amber-400 flex items-center justify-center
            shrink-0 hover:bg-amber-400 transition-all duration-150 group/pay"
        >
          <span className="w-2 h-2 rounded-full bg-transparent group-hover/pay:bg-white transition-all" />
        </button>
      ) : (
        <div className="w-5 shrink-0" />
      )}

      {/* Category icon */}
      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
        style={{ background: t.category_color ? `${t.category_color}22` : 'var(--surface-overlay)' }}>
        {t.category_icon || '📦'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--ink)] truncate">
            {t.description || t.category_name || '—'}
          </span>
          {isPending && (
            <span className="badge bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] shrink-0">
              ausstehend
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--ink-faint)] mt-0.5">
          {t.category_name && t.description ? `${t.category_name} · ` : ''}
          {formatDate(t.date)}
        </div>
      </div>

      {/* Amount */}
      <div className={`font-mono font-medium tabular-nums text-sm shrink-0
        ${t.type === 'income' ? 'amount-positive' : isPending ? 'text-amber-600 dark:text-amber-400' : 'amount-negative'}`}>
        {t.type === 'income' ? '+' : '−'}{formatCurrency(Number(t.amount))}
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={() => onEdit(t)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--ink-faint)]
            hover:text-[var(--ink)] hover:bg-[var(--border)] transition-all text-xs">✎</button>
        <button onClick={() => onDelete(t.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-[var(--ink-faint)]
            hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all text-sm">×</button>
      </div>
    </div>
  );
}
