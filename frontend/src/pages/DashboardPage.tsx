import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { transactionsApi } from '../services/api';
import type { Summary, Transaction } from '../types';
import { currentMonth, formatMonth } from '../utils/format';
import { useAuth } from '../context/AuthContext';
import SummaryCards from '../components/dashboard/SummaryCards';
import CategoryChart from '../components/charts/CategoryChart';
import TrendChart from '../components/charts/TrendChart';
import TransactionItem from '../components/transactions/TransactionItem';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';

export default function DashboardPage() {
  const { user } = useAuth();
  const [{ month, year }, setMonthYear] = useState(currentMonth);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>();
  const [chartTab, setChartTab] = useState<'expense' | 'income'>('expense');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, transactionsRes] = await Promise.all([
        transactionsApi.getSummary({ month, year }),
        transactionsApi.list({ month, year, limit: 5 }),
      ]);
      setSummary(summaryRes.data);
      setRecent(transactionsRes.data.data);
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  const shiftMonth = (delta: number) => {
    setMonthYear((prev) => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m > 12) { m = 1; y++; }
      if (m < 1) { m = 12; y--; }
      return { month: m, year: y };
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return;
    await transactionsApi.delete(id);
    load();
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between animate-on-mount">
        <div>
          <p className="text-sm text-[var(--ink-faint)]">{greeting},</p>
          <h1 className="font-display text-3xl text-[var(--ink)] mt-0.5">
            {user?.name?.split(' ')[0] || 'Willkommen'}
          </h1>
        </div>
        <button onClick={() => { setEditingTransaction(undefined); setShowForm(true); }}
          className="btn-primary">
          + Neu
        </button>
      </div>

      {/* Month selector */}
      <div className="flex items-center gap-3 animate-on-mount stagger-1">
        <button onClick={() => shiftMonth(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] transition-all">
          ←
        </button>
        <span className="font-medium text-[var(--ink)] min-w-[160px] text-center">
          {formatMonth(month, year)}
        </span>
        <button
          onClick={() => shiftMonth(1)}
          disabled={month === currentMonth().month && year === currentMonth().year}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] transition-all
            disabled:opacity-30 disabled:cursor-not-allowed">
          →
        </button>
      </div>

      {loading && !summary ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : summary ? (
        <>
          {/* KPI cards */}
          <SummaryCards summary={summary} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-on-mount stagger-2">
            {/* Category breakdown */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-[var(--ink)]">Nach Kategorie</h3>
                <div className="flex gap-1 bg-[var(--surface-overlay)] rounded-lg p-0.5">
                  {(['expense', 'income'] as const).map((t) => (
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

            {/* Monthly trend */}
            <div className="card p-5">
              <h3 className="font-display text-[var(--ink)] mb-4">Verlauf (6 Monate)</h3>
              <TrendChart data={summary.monthlyTrend} />
            </div>
          </div>

          {/* Recent transactions */}
          <div className="card animate-on-mount stagger-3">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <h3 className="font-display text-[var(--ink)]">Letzte Transaktionen</h3>
              <Link to="/transactions"
                className="text-xs text-[var(--accent)] hover:underline transition-all">
                Alle anzeigen →
              </Link>
            </div>
            <div className="px-2 py-2">
              {recent.length === 0 ? (
                <div className="text-center py-8 text-[var(--ink-faint)] text-sm">
                  Noch keine Transaktionen in diesem Monat.{' '}
                  <button onClick={() => setShowForm(true)}
                    className="text-[var(--accent)] hover:underline">
                    Erste hinzufügen
                  </button>
                </div>
              ) : (
                recent.map((t, i) => (
                  <TransactionItem
                    key={t.id}
                    transaction={t}
                    index={i}
                    onEdit={(tx) => { setEditingTransaction(tx); setShowForm(true); }}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </div>
        </>
      ) : null}

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditingTransaction(undefined); }}
        title={editingTransaction ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
      >
        <TransactionForm
          transaction={editingTransaction}
          onSuccess={() => { setShowForm(false); setEditingTransaction(undefined); load(); }}
          onCancel={() => { setShowForm(false); setEditingTransaction(undefined); }}
        />
      </Modal>
    </div>
  );
}
