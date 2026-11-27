import { useState } from 'react';
import type { PeriodItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface Props {
  item: PeriodItem;
  onTogglePaid: (item: PeriodItem) => void;
  onChangeAmount: (item: PeriodItem, amount: number) => void;
}

const CREDITOR_LABEL: Record<string, string> = {
  privat: 'Privat', inkasso: 'Inkasso', ratenkauf: 'Ratenkauf', sonstige: 'Sonstige',
};

/** parse a DE-formatted number string (comma as decimal separator) */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.')) || 0;
}

export default function PeriodItemRow({ item, onTogglePaid, onChangeAmount }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.planned_amount).replace('.', ','));

  const commit = () => {
    setEditing(false);
    const value = parseAmount(draft);
    if (value !== item.planned_amount) onChangeAmount(item, value);
  };

  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <button
        onClick={() => onTogglePaid(item)}
        title={item.paid ? 'Als offen markieren' : 'Als bezahlt markieren'}
        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all
          ${item.paid ? 'bg-[var(--success)] border-[var(--success)] text-white' : 'border-[var(--border-strong)] hover:border-[var(--accent)]'}`}
      >
        {item.paid && '✓'}
      </button>

      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium truncate ${item.paid ? 'text-[var(--ink-muted)] line-through' : 'text-[var(--ink)]'}`}>
          {item.name}
        </div>
        <div className="text-xs text-[var(--ink-faint)] flex items-center gap-1.5">
          {item.due_day && <span>fällig am {item.due_day}.</span>}
          {item.creditor_type && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-overlay)]">{CREDITOR_LABEL[item.creditor_type]}</span>
          )}
          {item.subscription_next_due_date && <span>nächste Abbuchung {formatDate(item.subscription_next_due_date)}</span>}
          {item.subscription_category && (
            <span className="px-1.5 py-0.5 rounded bg-[var(--surface-overlay)]">{item.subscription_category}</span>
          )}
        </div>
      </div>

      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
          className="input w-24 font-mono text-sm text-right"
        />
      ) : (
        <button
          onClick={() => { setDraft(String(item.planned_amount).replace('.', ',')); setEditing(true); }}
          title="Betrag für diesen Zeitraum ändern"
          className="font-mono text-sm tabular-nums text-[var(--ink)] hover:underline shrink-0"
        >
          {formatCurrency(item.paid ? (item.paid_amount ?? item.planned_amount) : item.planned_amount)}
        </button>
      )}
    </div>
  );
}
