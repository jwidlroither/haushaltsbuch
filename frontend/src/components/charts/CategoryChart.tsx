import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import type { CategorySummary } from '../../types';
import { formatCurrency } from '../../utils/format';

interface CategoryChartProps {
  data: CategorySummary[];
  type: 'income' | 'expense';
}

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { color: string } }> }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 shadow-card">
      <div className="text-xs text-[var(--ink-muted)]">{payload[0].name}</div>
      <div className="font-mono font-semibold text-[var(--ink)]">{formatCurrency(payload[0].value)}</div>
    </div>
  );
};

export default function CategoryChart({ data, type }: CategoryChartProps) {
  const filtered = data.filter((d) => d.type === type);

  if (!filtered.length) {
    return (
      <div className="flex items-center justify-center h-48 text-[var(--ink-faint)] text-sm">
        Keine Daten für diesen Monat
      </div>
    );
  }

  const chartData = filtered.map((d) => ({
    name: `${d.icon} ${d.name}`,
    value: parseFloat(d.total as unknown as string),
    color: d.color,
  }));

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          strokeWidth={0}
        >
          {chartData.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} opacity={0.9} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span className="text-xs text-[var(--ink-muted)]">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
