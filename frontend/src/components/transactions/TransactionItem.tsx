import type { Transaction } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface TransactionItemProps {
  transaction: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  index?: number;
}

export default function TransactionItem({ transaction: t, onEdit, onDelete, index = 0 }: TransactionItemProps) {
  return (
    <div
      className="group flex items-center gap-4 p-4 hover:bg-[var(--surface-overlay)]
        rounded-[var(--radius-sm)] transition-all duration-150 animate-on-mount"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Category icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
        style={{
          background: t.category_color ? `${t.category_color}22` : 'var(--surface-overlay)',
        }}
      >
        {t.category_icon || '📦'}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-[var(--ink)] truncate">
            {t.description || t.category_name || '—'}
          </span>
          {t.category_name && t.description && (
            <span className="text-[10px] text-[var(--ink-faint)] truncate hidden sm:block">
              {t.category_name}
            </span>
          )}
        </div>
        <div className="text-xs text-[var(--ink-faint)] mt-0.5">{formatDate(t.date)}</div>
      </div>

      {/* Amount */}
      <div className={`font-mono font-medium tabular-nums text-sm shrink-0
        ${t.type === 'income' ? 'amount-positive' : 'amount-negative'}`}>
        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
      </div>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        <button
          onClick={() => onEdit(t)}
          className="w-7 h-7 flex items-center justify-center rounded-lg
            text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--border)]
            transition-all duration-150 text-xs"
          title="Bearbeiten"
        >
          ✎
        </button>
        <button
          onClick={() => onDelete(t.id)}
          className="w-7 h-7 flex items-center justify-center rounded-lg
            text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20
            transition-all duration-150 text-sm"
          title="Löschen"
        >
          ×
        </button>
      </div>
    </div>
  );
}
