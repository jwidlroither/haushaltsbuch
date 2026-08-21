import { useState, useEffect } from 'react';
import { recurringApi } from '../../services/api';
import type { UpcomingPreviewItem } from '../../types';
import { formatCurrency, formatDate } from '../../utils/format';

interface Props { month: number; year: number; }

export default function UpcomingWidget({ month, year }: Props) {
  const [items, setItems] = useState<UpcomingPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    recurringApi.preview(2)
      .then(res => {
        // Only show items in the target month or next month
        const targetStr = `${year}-${String(month).padStart(2,'0')}`;
        const nextDate = new Date(year, month, 1);
        const nextStr  = `${nextDate.getFullYear()}-${String(nextDate.getMonth()+1).padStart(2,'0')}`;
        const filtered = res.data.data.filter(i =>
          i.date.startsWith(targetStr) || i.date.startsWith(nextStr)
        );
        setItems(filtered.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [month, year]);

  if (!loading && items.length === 0) return null;

  const totalExpense = items
    .filter(i => i.type === 'expense')
    .reduce((s, i) => s + Number(i.amount), 0);

  return (
    <div className="card animate-on-mount stagger-3">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span className="text-base">↻</span>
          <h3 className="font-display text-[var(--ink)]">Demnächst fällig</h3>
        </div>
        {totalExpense > 0 && (
          <span className="font-mono text-sm text-[var(--danger)] font-semibold">
            −{formatCurrency(totalExpense)}
          </span>
        )}
      </div>

      {loading ? (
        <div className="px-5 py-4 space-y-2">
          {[0,1,2].map(i => (
            <div key={i} className="flex gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[var(--surface-overlay)] shrink-0"/>
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-[var(--surface-overlay)] rounded w-32"/>
                <div className="h-2.5 bg-[var(--surface-overlay)] rounded w-20"/>
              </div>
              <div className="h-4 w-16 bg-[var(--surface-overlay)] rounded"/>
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {items.map((item, i) => {
            const isNextMonth = !item.date.startsWith(`${year}-${String(month).padStart(2,'0')}`);
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-overlay)] transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                  style={{ background: item.category_color ? `${item.category_color}22` : 'var(--surface-overlay)' }}>
                  {item.category_icon ?? '↻'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--ink)] truncate">
                      {item.description ?? item.category_name ?? '—'}
                    </span>
                    {isNextMonth && (
                      <span className="badge bg-[var(--surface-overlay)] text-[var(--ink-faint)] text-[10px] shrink-0">
                        nächster Monat
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[var(--ink-faint)]">{formatDate(item.date)}</div>
                </div>
                <span className={`font-mono text-sm font-semibold tabular-nums shrink-0
                  ${item.type==='income' ? 'amount-positive' : 'text-[var(--ink-muted)]'}`}>
                  {item.type==='income' ? '+' : '−'}{formatCurrency(Number(item.amount))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
