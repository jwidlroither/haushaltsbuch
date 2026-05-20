import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { transactionsApi, budgetApi, categoriesApi } from '../services/api';
import type { Summary, Transaction, BudgetOverview, Category } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useMonthNav } from '../hooks/useMonthNav';
import SummaryCards from '../components/dashboard/SummaryCards';
import BudgetBar from '../components/dashboard/BudgetBar';
import PendingList from '../components/dashboard/PendingList';
import CategoryChart from '../components/charts/CategoryChart';
import TrendChart from '../components/charts/TrendChart';
import TransactionItem from '../components/transactions/TransactionItem';
import MonthSelector from '../components/ui/MonthSelector';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import BudgetModal from '../components/ui/BudgetModal';
import { DashboardSkeleton } from '../components/ui/Skeleton';

export default function DashboardPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { monthYear, shiftMonth, direction, isCurrentMonth } = useMonthNav();
  const { month, year } = monthYear;

  const [summary,    setSummary]    = useState<Summary | null>(null);
  const [overview,   setOverview]   = useState<BudgetOverview | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recent,     setRecent]     = useState<Transaction[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [showBudget, setShowBudget] = useState(false);
  const [editing,    setEditing]    = useState<Transaction | undefined>();
  const [chartTab,   setChartTab]   = useState<'expense' | 'income'>('expense');

  // Open "new transaction" from PWA shortcut
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('action') === 'new') {
      setShowForm(true);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, ovRes, txRes, catRes] = await Promise.all([
        transactionsApi.getSummary({ month, year }),
        budgetApi.overview(month, year),
        transactionsApi.list({ month, year, limit: 8 }),
        categoriesApi.list(),
      ]);
      setSummary(sumRes.data);
      setOverview(ovRes.data);
      setRecent(txRes.data.data);
      setCategories(catRes.data.data);
    } catch {
      toast.error('Daten konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [month, year, toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return;
    try {
      await transactionsApi.delete(id);
      toast.success('Transaktion gelöscht.');
      load();
    } catch { toast.error('Löschen fehlgeschlagen.'); }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await transactionsApi.markPaid(id);
      toast.success('Als bezahlt markiert ✓');
      load();
    } catch { toast.error('Aktion fehlgeschlagen.'); }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  if (loading && !summary) return <DashboardSkeleton />;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between animate-on-mount">
        <div>
          <p className="text-sm text-[var(--ink-faint)]">{greeting},</p>
          <h1 className="font-display text-3xl text-[var(--ink)] mt-0.5">
            {user?.name?.split(' ')[0] || 'Willkommen'}
          </h1>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="btn-primary">
          + Neu
        </button>
      </div>

      {/* Month selector */}
      <div className="animate-on-mount stagger-1">
        <MonthSelector
          month={month} year={year}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          disableNext={isCurrentMonth}
          direction={direction}
          loading={loading}
        />
      </div>

      {/* Budget Bar */}
      {overview && <BudgetBar overview={overview} onSetBudget={() => setShowBudget(true)} />}

      {/* KPI Cards */}
      {summary && <SummaryCards summary={summary} />}

      {/* Ausstehende Ausgaben */}
      {overview && overview.pendingTransactions.length > 0 && (
        <PendingList
          transactions={overview.pendingTransactions}
          onMarkPaid={handleMarkPaid}
          onEdit={t => { setEditing(t); setShowForm(true); }}
        />
      )}

      {/* Charts */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-on-mount stagger-2">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-[var(--ink)]">Nach Kategorie</h3>
              <div className="flex gap-1 bg-[var(--surface-overlay)] rounded-lg p-0.5">
                {(['expense','income'] as const).map(t => (
                  <button key={t} onClick={() => setChartTab(t)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all
                      ${chartTab===t ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}>
                    {t==='expense' ? 'Ausgaben' : 'Einnahmen'}
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
      )}

      {/* Recent transactions */}
      <div className="card animate-on-mount stagger-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="font-display text-[var(--ink)]">Letzte Transaktionen</h3>
          <Link to="/transactions" className="text-xs text-[var(--accent)] hover:underline">
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
              <TransactionItem key={t.id} transaction={t} index={i}
                onEdit={tx => { setEditing(tx); setShowForm(true); }}
                onDelete={handleDelete}
                onMarkPaid={handleMarkPaid}
              />
            ))
          )}
        </div>
      </div>

      <Modal isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined); }}
        title={editing ? 'Transaktion bearbeiten' : 'Neue Transaktion'}>
        <TransactionForm
          transaction={editing}
          onSuccess={() => { setShowForm(false); setEditing(undefined); load(); }}
          onCancel={() => { setShowForm(false); setEditing(undefined); }}
        />
      </Modal>

      <BudgetModal isOpen={showBudget} onClose={() => setShowBudget(false)}
        month={month} year={year} categories={categories} onSaved={load} />
    </div>
  );
}
