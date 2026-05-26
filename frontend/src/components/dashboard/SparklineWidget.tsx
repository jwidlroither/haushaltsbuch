import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, Tooltip, ResponsiveContainer, YAxis, XAxis } from 'recharts';
import api from '../../services/api';
import { formatCurrency } from '../../utils/format';

type Range = '7d' | 'month' | 'year' | 'all';

interface SparkPoint {
  period: string;
  income: number;
  expense: number;
  balance: number;
}

const RANGES: { key: Range; label: string }[] = [
  { key: '7d',    label: '7T'   },
  { key: 'month', label: '30T'  },
  { key: 'year',  label: '1 J'  },
  { key: 'all',   label: 'Alle' },
];

function fmtPeriod(period: string, range: Range): string {
  const d = new Date(period);
  if (range === '7d')    return d.toLocaleDateString('de-AT', { day: '2-digit', month: 'short' });
  if (range === 'month') return d.toLocaleDateString('de-AT', { day: '2-digit', month: 'short' });
  if (range === 'year')  return d.toLocaleDateString('de-AT', { month: 'short', year: '2-digit' });
  return d.toLocaleDateString('de-AT', { year: 'numeric' });
}

const SparkTooltip = ({ active, payload, range }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload: SparkPoint }>;
  range: Range;
}) => {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 shadow-modal text-xs min-w-[130px]">
      <div className="text-[var(--ink-faint)] mb-2 font-medium">{fmtPeriod(p.period, range)}</div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[var(--ink-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />Einnahmen
          </span>
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            +{formatCurrency(p.income)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-[var(--ink-muted)]">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />Ausgaben
          </span>
          <span className="font-mono font-semibold text-red-500">
            −{formatCurrency(p.expense)}
          </span>
        </div>
        <div className="border-t border-[var(--border)] pt-1 mt-1 flex items-center justify-between">
          <span className="text-[var(--ink-muted)]">Saldo</span>
          <span className={`font-mono font-bold ${p.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
            {p.balance >= 0 ? '+' : ''}{formatCurrency(p.balance)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default function SparklineWidget() {
  const [range, setRange] = useState<Range>('month');
  const [data, setData]   = useState<SparkPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get<{ data: SparkPoint[] }>('/transactions/sparkline', { params: { range } })
      .then(r => setData(r.data.data))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const totalIncome  = data.reduce((s, d) => s + d.income,  0);
  const totalExpense = data.reduce((s, d) => s + d.expense, 0);
  const balance      = totalIncome - totalExpense;

  const showXAxis = data.length > 1;

  return (
    <div className="card p-5 animate-on-mount">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-display font-bold text-[var(--ink)] text-base tracking-tight">Cashflow</h3>
          <p className="text-xs text-[var(--ink-faint)] mt-0.5">Einnahmen &amp; Ausgaben im Zeitverlauf</p>
        </div>
        <div className="flex gap-0.5 bg-[var(--surface-overlay)] rounded-lg p-0.5">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150
                ${range === r.key
                  ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm'
                  : 'text-[var(--ink-faint)] hover:text-[var(--ink-muted)]'
                }`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-emerald-50 dark:bg-emerald-950/40 rounded-[var(--radius-sm)] px-3 py-2.5">
          <div className="text-[10px] font-semibold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-0.5">
            Einnahmen
          </div>
          <div className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            +{formatCurrency(totalIncome)}
          </div>
        </div>
        <div className="bg-red-50 dark:bg-red-950/40 rounded-[var(--radius-sm)] px-3 py-2.5">
          <div className="text-[10px] font-semibold text-red-500/70 uppercase tracking-wider mb-0.5">
            Ausgaben
          </div>
          <div className="font-mono text-sm font-bold text-red-500 tabular-nums">
            −{formatCurrency(totalExpense)}
          </div>
        </div>
        <div className={`rounded-[var(--radius-sm)] px-3 py-2.5
          ${balance >= 0
            ? 'bg-emerald-50 dark:bg-emerald-950/40'
            : 'bg-red-50 dark:bg-red-950/40'
          }`}>
          <div className={`text-[10px] font-semibold uppercase tracking-wider mb-0.5
            ${balance >= 0
              ? 'text-emerald-600/70 dark:text-emerald-400/70'
              : 'text-red-500/70'
            }`}>
            Saldo
          </div>
          <div className={`font-mono text-sm font-bold tabular-nums
            ${balance >= 0
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-500'
            }`}>
            {balance >= 0 ? '+' : ''}{formatCurrency(balance)}
          </div>
        </div>
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-24 rounded-[var(--radius-sm)] bg-[var(--surface-overlay)] animate-pulse" />
      ) : data.length === 0 ? (
        <div className="h-24 flex items-center justify-center text-sm text-[var(--ink-faint)]">
          Keine Daten für diesen Zeitraum
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={showXAxis ? 110 : 88}>
          <AreaChart data={data} margin={{ top: 4, right: 2, left: 2, bottom: 0 }}>
            <defs>
              <linearGradient id="sparkIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#22c55e" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#22c55e" stopOpacity={0}    />
              </linearGradient>
              <linearGradient id="sparkExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.22} />
                <stop offset="100%" stopColor="#ef4444" stopOpacity={0}    />
              </linearGradient>
            </defs>
            <YAxis domain={['auto', 'auto']} hide />
            {showXAxis && (
              <XAxis
                dataKey="period"
                tickFormatter={p => fmtPeriod(p, range)}
                tick={{ fontSize: 10, fill: 'var(--ink-faint)' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
            )}
            <Tooltip
              content={({ active, payload }) => (
                <SparkTooltip active={active} payload={payload as never} range={range} />
              )}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#sparkIncomeGrad)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#sparkExpenseGrad)"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
