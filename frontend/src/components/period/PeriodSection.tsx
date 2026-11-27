import { useState, type ReactNode } from 'react';
import { formatCurrency } from '../../utils/format';

interface Props {
  title: string;
  icon: string;
  planned: number;
  paid: number;
  defaultOpen?: boolean;
  emptyLabel?: string;
  isEmpty?: boolean;
  action?: ReactNode;
  children: ReactNode;
}

/** Einklappbarer Bereich mit geplant/bezahlt-Zwischensumme (wie im Excel). */
export default function PeriodSection({
  title, icon, planned, paid, defaultOpen = true, emptyLabel, isEmpty, action, children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const open_ = planned - paid;

  return (
    <div className="card animate-on-mount">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg shrink-0">{icon}</span>
          <h3 className="font-display text-[var(--ink)] truncate">{title}</h3>
          <span className="text-[var(--ink-faint)] transition-transform shrink-0" style={{ transform: open ? 'rotate(90deg)' : 'none' }}>
            ›
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs shrink-0">
          <span className="text-[var(--ink-muted)]">
            Geplant <span className="font-mono text-[var(--ink)]">{formatCurrency(planned)}</span>
          </span>
          <span className="text-[var(--ink-muted)]">
            Bezahlt <span className="font-mono text-[var(--success)]">{formatCurrency(paid)}</span>
          </span>
          {open_ > 0.004 && (
            <span className="hidden sm:inline text-[var(--ink-muted)]">
              Offen <span className="font-mono text-[var(--warning)]">{formatCurrency(open_)}</span>
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="border-t border-[var(--border)]">
          {isEmpty ? (
            <div className="px-5 py-6 text-center text-sm text-[var(--ink-faint)]">{emptyLabel}</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">{children}</div>
          )}
          {action && <div className="px-5 py-3 border-t border-[var(--border)]">{action}</div>}
        </div>
      )}
    </div>
  );
}
