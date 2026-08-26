import { useState, useEffect, useCallback } from 'react';
import { transactionsApi, categoriesApi, downloadExport } from '../services/api';
import type { Transaction, Category, TransactionFilters } from '../types';
import { useToast } from '../context/ToastContext';
import { useMonthNav } from '../hooks/useMonthNav';
import { groupTransactionsByDate } from '../utils/format';
import TransactionItem from '../components/transactions/TransactionItem';
import MonthSelector from '../components/ui/MonthSelector';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import { TransactionSkeleton } from '../components/ui/Skeleton';

const LIMIT = 20;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap
        ${active
          ? 'bg-[var(--accent)] border-[var(--accent)] text-white'
          : 'bg-[var(--surface)] border-[var(--border)] text-[var(--ink-muted)] hover:border-[var(--accent)] hover:text-[var(--ink)]'}`}>
      {children}
    </button>
  );
}

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

  // Reagiert auf Transaktionen, die z.B. über die Schnelleingabe (FAB) angelegt wurden
  useEffect(() => {
    window.addEventListener('hb:tx-changed', load);
    return () => window.removeEventListener('hb:tx-changed', load);
  }, [load]);

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
  const groups = groupTransactionsByDate(transactions);

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

      {/* Month + Quick-Filter Chips */}
      <div className="card p-4 space-y-3 animate-on-mount stagger-1">
        <MonthSelector
          month={month} year={year}
          onPrev={() => shiftMonth(-1)}
          onNext={() => shiftMonth(1)}
          disableNext={isCurrentMonth}
          direction={direction}
          loading={loading}
        />

        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          <Chip active={typeFilter === ''} onClick={() => setTypeFilter('')}>Alle Typen</Chip>
          <Chip active={typeFilter === 'expense'} onClick={() => setTypeFilter('expense')}>↑ Ausgaben</Chip>
          <Chip active={typeFilter === 'income'} onClick={() => setTypeFilter('income')}>↓ Einnahmen</Chip>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          <Chip active={statusFilter === ''} onClick={() => setStatusFilter('')}>Alle Status</Chip>
          <Chip active={statusFilter === 'bezahlt'} onClick={() => setStatusFilter('bezahlt')}>✓ Bezahlt</Chip>
          <Chip active={statusFilter === 'ausstehend'} onClick={() => setStatusFilter('ausstehend')}>⏳ Ausstehend</Chip>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          <Chip active={catFilter === ''} onClick={() => setCatFilter('')}>Alle Kategorien</Chip>
          {categories.map(c => (
            <Chip key={c.id} active={catFilter === c.id} onClick={() => setCatFilter(c.id)}>
              {c.icon} {c.name}
            </Chip>
          ))}
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

      {/* Grouped list */}
      {loading ? (
        <div className="card animate-on-mount stagger-2">
          <div className="px-2 py-2 space-y-1">
            {[0,1,2,3,4,5].map(i => <TransactionSkeleton key={i} />)}
          </div>
        </div>
      ) : transactions.length === 0 ? (
        <div className="card text-center py-16 text-[var(--ink-faint)] text-sm animate-on-mount stagger-2">
          <div className="text-3xl mb-3">📭</div>
          Keine Transaktionen gefunden.{' '}
          <button onClick={() => setShowForm(true)}
            className="text-[var(--accent)] hover:underline">
            Erste hinzufügen
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-on-mount stagger-2">
          {groups.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold text-[var(--ink-faint)] uppercase tracking-wider mb-1.5 px-1">
                {group.label}
              </h3>
              <div className="card px-2 py-2">
                {group.items.map((t, i) => (
                  <TransactionItem key={t.id} transaction={t} index={i}
                    onEdit={tx => { setEditing(tx); setShowForm(true); }}
                    onDelete={handleDelete}
                    onMarkPaid={handleMarkPaid} />
                ))}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {total > LIMIT && (
            <div className="card flex items-center justify-between px-5 py-3">
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
      )}

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
