import { useState, useEffect, useCallback } from 'react';
import { periodsApi, transactionsApi, downloadExport } from '../services/api';
import type { PeriodHistoryEntry, Summary } from '../types';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, currentMonth } from '../utils/format';
import SummaryCards from '../components/dashboard/SummaryCards';
import CategoryChart from '../components/charts/CategoryChart';
import TrendChart from '../components/charts/TrendChart';
import SparklineWidget from '../components/dashboard/SparklineWidget';

export default function VerlaufPage() {
  const { toast } = useToast();
  const [periods, setPeriods] = useState<PeriodHistoryEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartTab, setChartTab] = useState<'expense' | 'income'>('expense');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { month, year } = currentMonth();
      const [histRes, sumRes] = await Promise.all([
        periodsApi.history(12),
        transactionsApi.getSummary({ month, year }),
      ]);
      setPeriods(histRes.data.data);
      setSummary(sumRes.data);
    } catch { toast.error('Verlauf konnte nicht geladen werden.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-on-mount">
        <h1 className="font-display text-3xl text-[var(--ink)]">Verlauf</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadExport('csv').catch(() => toast.error('CSV-Export fehlgeschlagen.'))}
            className="btn-ghost text-sm px-3">↓ CSV</button>
          <button onClick={() => downloadExport('pdf').catch(() => toast.error('PDF-Export fehlgeschlagen.'))}
            className="btn-ghost text-sm px-3">↓ PDF</button>
        </div>
      </div>

      {/* Vergangene Zeiträume */}
      <div className="card divide-y divide-[var(--border)] animate-on-mount">
        {loading ? (
          <div className="px-5 py-6 text-center text-sm text-[var(--ink-faint)]">Lädt…</div>
        ) : periods.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--ink-faint)]">Noch keine abgeschlossenen Zeiträume.</div>
        ) : periods.map(p => {
          const isOver = p.available < 0;
          return (
            <div key={p.period.start} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--ink)]">
                  {formatDate(p.period.start, 'dd.MM.')}–{formatDate(p.period.end, 'dd.MM.yyyy')}
                </div>
                <div className="text-xs text-[var(--ink-faint)]">
                  Einkommen {formatCurrency(p.income)} · Fixkosten {formatCurrency(p.fixedCosts.planned)} ·
                  {' '}Rückzahlungen {formatCurrency(p.debts.planned)} · Ausgaben {formatCurrency(p.expenses.planned)}
                </div>
              </div>
              <div className={`font-mono text-sm font-semibold tabular-nums shrink-0 ${isOver ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
                {isOver ? '-' : ''}{formatCurrency(Math.abs(p.available))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bestehende Statistiken (Kalendermonat-basiert) */}
      {summary && (
        <>
          <SummaryCards summary={summary} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-on-mount">
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[var(--ink)]">Nach Kategorie</h3>
                <div className="flex gap-1 bg-[var(--surface-overlay)] rounded-lg p-0.5">
                  {(['expense', 'income'] as const).map(t => (
                    <button key={t} onClick={() => setChartTab(t)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                        ${chartTab === t ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}>
                      {t === 'expense' ? 'Ausgaben' : 'Einnahmen'}
                    </button>
                  ))}
                </div>
              </div>
              <CategoryChart data={summary.byCategory} type={chartTab} />
            </div>
            <div className="card p-5">
              <h3 className="font-display text-[var(--ink)] mb-4">Verlauf (6 Monate)</h3>
              <TrendChart data={summary.monthlyTrend} />
            </div>
          </div>
        </>
      )}

      <SparklineWidget />
    </div>
  );
}
