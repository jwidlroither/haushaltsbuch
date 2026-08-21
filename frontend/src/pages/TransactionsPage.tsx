import { useState, useEffect, useCallback } from 'react';
import { transactionsApi, categoriesApi, downloadExport } from '../services/api';
import type { Transaction, Category, TransactionFilters } from '../types';
import { useToast } from '../context/ToastContext';
import { useMonthNav } from '../hooks/useMonthNav';
import TransactionItem from '../components/transactions/TransactionItem';
import MonthSelector from '../components/ui/MonthSelector';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import { TransactionSkeleton } from '../components/ui/Skeleton';

const LIMIT = 20;

export default function TransactionsPage() {
  const { toast } = useToast();
  const { monthYear, shiftMonth, direction, isCurrentMonth } = useMonthNav();
  const { month, year } = monthYear;

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [total,        setTotal]         = useState(0);
  const [loading,      setLoading]       = useState(true);
  const [showForm,     setShowForm]      = useState(false);
  const [editing,      setEditing]       = useState<Transaction | undefined>();
  const [offset,       setOffset]        = useState(0);
  const [typeFilter,   setTypeFilter]    = useState('');
  const [statusFilter, setStatusFilter]  = useState('');
  const [catFilter,    setCatFilter]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters: TransactionFilters = {
        month, year, limit: LIMIT, offset,
        ...(typeFilter   && { type:        typeFilter   as 'income' | 'expense' }),
        ...(statusFilter && { status:      statusFilter as 'bezahlt' | 'ausstehend' }),
        ...(catFilter    && { category_id: catFilter }),
      };
      const res = await transactionsApi.list(filters);
      setTransactions(res.data.data);
      setTotal(res.data.total ?? 0);
    } catch {
      toast.error('Transaktionen konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  }, [month, year, offset, typeFilter, statusFilter, catFilter, toast]);

  useEffect(() => { categoriesApi.list().then(r => setCategories(r.data.data)); }, []);
  useEffect(() => { load(); }, [load]);

  // Reset offset when filters or month change
  useEffect(() => { setOffset(0); }, [month, year, typeFilter, statusFilter, catFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return;
    try { await transactionsApi.delete(id); toast.success('Gelöscht.'); load(); }
    catch { toast.error('Löschen fehlgeschlagen.'); }
  };

  const handleMarkPaid = async (id: string) => {
    try { await transactionsApi.markPaid(id); toast.success('Als bezahlt markiert ✓'); load(); }
    catch { toast.error('Aktion fehlgeschlagen.'); }
  };

  const pendingCount = transactions.filter(t => t.status === 'ausstehend').length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-on-mount">
        <h1 className="font-display text-3xl text-[var(--ink)]">Transaktionen</h1>
        <button onClick={() => downloadExport('csv', { month, year, type: typeFilter || undefined, status: statusFilter || undefined }).catch(() => toast.error('Export fehlgeschlagen.'))} className="btn-secondary text-sm" title="Als CSV exportieren">↓ CSV</button>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="btn-primary">
          + Neu
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3 animate-on-mount stagger-1">
        <MonthSelector
          month={month} year={year}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          disableNext={isCurrentMonth}
          direction={direction}
          loading={loading}
        />
        <div className="grid grid-cols-3 gap-2">
          <select value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="input text-sm" aria-label="Typ filtern">
            <option value="">Alle Typen</option>
            <option value="expense">↑ Ausgaben</option>
            <option value="income">↓ Einnahmen</option>
          </select>
          <select value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="input text-sm" aria-label="Status filtern">
            <option value="">Alle Status</option>
            <option value="bezahlt">✓ Bezahlt</option>
            <option value="ausstehend">⏳ Ausstehend</option>
          </select>
          <select value={catFilter}
            onChange={e => setCatFilter(e.target.value)}
            className="input text-sm" aria-label="Kategorie filtern">
            <option value="">Alle Kategorien</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
      </div>

      {/* Pending notice */}
      {pendingCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-[var(--radius-sm)]
          bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800
          text-amber-700 dark:text-amber-300 text-sm animate-on-mount" role="status">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          {pendingCount} ausstehende Ausgabe{pendingCount !== 1 ? 'n' : ''} in diesem Monat
        </div>
      )}

      {/* List */}
      <div className="card animate-on-mount stagger-2">
        {loading ? (
          <div className="px-2 py-2 space-y-1">
            {[0,1,2,3,4,5].map(i => <TransactionSkeleton key={i} />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-[var(--ink-faint)] text-sm">
            <div className="text-3xl mb-3">📭</div>
            Keine Transaktionen gefunden.{' '}
            <button onClick={() => setShowForm(true)}
              className="text-[var(--accent)] hover:underline">
              Erste hinzufügen
            </button>
          </div>
        ) : (
          <div className="px-2 py-2">
            {transactions.map((t, i) => (
              <TransactionItem key={t.id} transaction={t} index={i}
                onEdit={tx => { setEditing(tx); setShowForm(true); }}
                onDelete={handleDelete}
                onMarkPaid={handleMarkPaid}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--ink-faint)]">
              {offset+1}–{Math.min(offset+LIMIT, total)} von {total}
            </span>
            <div className="flex gap-2">
              <button disabled={offset===0}
                onClick={() => setOffset(Math.max(0, offset-LIMIT))}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                ← Zurück
              </button>
              <button disabled={offset+LIMIT>=total}
                onClick={() => setOffset(offset+LIMIT)}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40">
                Weiter →
              </button>
            </div>
          </div>
        )}
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
    </div>
  );
}
