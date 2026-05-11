import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { MonthlyTrend } from '../../types';
import { getMonthName, formatCurrency } from '../../utils/format';

interface TrendChartProps {
  data: MonthlyTrend[];
}

interface ChartPoint {
  label: string;
  income: number;
  expense: number;
}

const CustomTooltip = ({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2.5 shadow-card">
      <div className="text-xs text-[var(--ink-muted)] mb-1.5 font-medium">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[var(--ink-muted)]">{p.name === 'income' ? 'Einnahmen' : 'Ausgaben'}:</span>
          <span className="font-mono font-medium text-[var(--ink)]">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function TrendChart({ data }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--ink-faint)] text-sm">
        Noch keine Verlaufsdaten verfügbar
      </div>
    );
  }

  // Build chart data by merging income/expense per month
  const map = new Map<string, ChartPoint>();
  data.forEach((d) => {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    const label = `${getMonthName(Number(d.month))} ${d.year}`;
    if (!map.has(key)) map.set(key, { label, income: 0, expense: 0 });
    const point = map.get(key)!;
    if (d.type === 'income') point.income = parseFloat(d.total as unknown as string);
    else point.expense = parseFloat(d.total as unknown as string);
  });

  const chartData = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--ink-faint)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `€${v > 999 ? `${(v / 1000).toFixed(1)}k` : v}`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="income"
          name="income"
          stroke="#22c55e"
          strokeWidth={2}
          fill="url(#incomeGrad)"
          dot={false}
        />
        <Area
          type="monotone"
          dataKey="expense"
          name="expense"
          stroke="#ef4444"
          strokeWidth={2}
          fill="url(#expenseGrad)"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
