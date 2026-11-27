import { useState } from 'react';
import type { PeriodItem } from '../../types';
import { formatCurrency } from '../../utils/format';
import PeriodItemRow from './PeriodItemRow';

interface Props {
  items: PeriodItem[];
  onTogglePaid: (item: PeriodItem) => void;
  onChangeAmount: (item: PeriodItem, amount: number) => void;
}

/** Abos zählen zu den Fixkosten (eine Summe, keine Doppelzählung) – erscheinen
 *  innerhalb des Fixkosten-Bereichs als eigene aufklappbare Unterzeile. */
export default function NestedAbosRow({ items, onTogglePaid, onChangeAmount }: Props) {
  const [open, setOpen] = useState(false);
  if (items.length === 0) return null;

  const planned = items.reduce((a, i) => a + i.planned_amount, 0);
  const paid = items.filter(i => i.paid).reduce((a, i) => a + (i.paid_amount ?? i.planned_amount), 0);

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-3 text-left hover:bg-[var(--surface-overlay)] transition-colors">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[var(--ink-faint)] transition-transform shrink-0" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>›</span>
          <span className="text-sm font-medium text-[var(--ink)]">🎬 Abos</span>
          <span className="text-xs text-[var(--ink-faint)]">({items.length})</span>
        </div>
        <div className="flex items-center gap-3 text-xs shrink-0">
          <span className="text-[var(--ink-muted)]">Geplant <span className="font-mono text-[var(--ink)]">{formatCurrency(planned)}</span></span>
          <span className="text-[var(--ink-muted)]">Bezahlt <span className="font-mono text-[var(--success)]">{formatCurrency(paid)}</span></span>
        </div>
      </button>
      {open && (
        <div className="pl-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {items.map(item => (
            <PeriodItemRow key={item.id} item={item} onTogglePaid={onTogglePaid} onChangeAmount={onChangeAmount} />
          ))}
        </div>
      )}
    </div>
  );
}
