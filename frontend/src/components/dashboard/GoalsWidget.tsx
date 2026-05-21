import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { goalsApi } from '../../services/api';
import type { SavingsGoal } from '../../types';
import { formatCurrency } from '../../utils/format';

export default function GoalsWidget() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    goalsApi.list()
      .then(res => setGoals(res.data.data.filter(g => !g.is_completed).slice(0, 3)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!loading && goals.length === 0) return null;

  return (
    <div className="card animate-on-mount stagger-4">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <span>🎯</span>
          <h3 className="font-display text-[var(--ink)]">Sparziele</h3>
        </div>
        <Link to="/goals" className="text-xs text-[var(--accent)] hover:underline">
          Alle anzeigen →
        </Link>
      </div>

      {loading ? (
        <div className="px-5 py-4 space-y-3">
          {[0,1].map(i => (
            <div key={i} className="animate-pulse space-y-1.5">
              <div className="flex justify-between">
                <div className="h-3 bg-[var(--surface-overlay)] rounded w-28"/>
                <div className="h-3 bg-[var(--surface-overlay)] rounded w-16"/>
              </div>
              <div className="h-2 bg-[var(--surface-overlay)] rounded-full"/>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-3 space-y-4">
          {goals.map(goal => {
            const pct = Math.min(100, Number(goal.progress_percent));
            const remaining = Number(goal.target_amount) - Number(goal.current_amount);
            return (
              <div key={goal.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{goal.icon}</span>
                    <span className="text-sm font-medium text-[var(--ink)] truncate max-w-[140px]">
                      {goal.name}
                    </span>
                  </div>
                  <div className="text-xs text-right">
                    <span className="font-mono font-medium text-[var(--ink)]">{pct}%</span>
                    <span className="text-[var(--ink-faint)] ml-1">
                      · noch {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[var(--surface-overlay)] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width:`${pct}%`, background: goal.color }}/>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
