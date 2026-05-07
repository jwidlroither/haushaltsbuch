import { useState, useEffect, useCallback } from 'react';
import { transactionsApi, categoriesApi } from '../services/api';
import type { Transaction, Category, TransactionFilters } from '../types';
import { currentMonth, formatMonth } from '../utils/format';
import TransactionItem from '../components/transactions/TransactionItem';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';

const LIMIT = 20;

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [offset, setOffset] = useState(0);

  const [filters, setFilters] = useState<TransactionFilters>({
    month: currentMonth().month,
    year: currentMonth().year,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transactionsApi.list({ ...filters, limit: LIMIT, offset });
      setTransactions(res.data.data);
      setTotal(res.data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [filters, offset]);

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data.data));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Transaktion wirklich löschen?')) return;
    await transactionsApi.delete(id);
    load();
  };

  const shiftMonth = (delta: number) => {
    setFilters((prev) => {
      const m = (prev.month || 1) + delta;
      let month = m, year = prev.year || new Date().getFullYear();
      if (month > 12) { month = 1; year++; }
      if (month < 1) { month = 12; year--; }
      return { ...prev, month, year };
    });
    setOffset(0);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between animate-on-mount">
        <h1 className="font-display text-3xl text-[var(--ink)]">Transaktionen</h1>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }}
          className="btn-primary">
          + Neu
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3 animate-on-mount stagger-1">
        {/* Month nav */}
        <div className="flex items-center gap-3">
          <button onClick={() => shiftMonth(-1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] transition-all">
            ←
          </button>
          <span className="font-medium text-[var(--ink)] flex-1 text-center">
            {formatMonth(filters.month!, filters.year!)}
          </span>
          <button onClick={() => shiftMonth(1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg
              text-[var(--ink-muted)] hover:bg-[var(--surface-overlay)] transition-all">
            →
          </button>
        </div>

        <div className="flex gap-2">
          {/* Type filter */}
          <select
            value={filters.type || ''}
            onChange={(e) => {
              setFilters((f) => ({ ...f, type: (e.target.value as 'income' | 'expense') || undefined }));
              setOffset(0);
            }}
            className="input flex-1"
          >
            <option value="">Alle Typen</option>
            <option value="expense">Ausgaben</option>
            <option value="income">Einnahmen</option>
          </select>

          {/* Category filter */}
          <select
            value={filters.category_id || ''}
            onChange={(e) => {
              setFilters((f) => ({ ...f, category_id: e.target.value || undefined }));
              setOffset(0);
            }}
            className="input flex-1"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="card animate-on-mount stagger-2">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 text-[var(--ink-faint)] text-sm">
            <div className="text-3xl mb-3">📭</div>
            Keine Transaktionen gefunden.{' '}
            <button onClick={() => setShowForm(true)} className="text-[var(--accent)] hover:underline">
              Erste hinzufügen
            </button>
          </div>
        ) : (
          <div className="px-2 py-2">
            {transactions.map((t, i) => (
              <TransactionItem
                key={t.id}
                transaction={t}
                index={i}
                onEdit={(tx) => { setEditing(tx); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[var(--border)]">
            <span className="text-xs text-[var(--ink-faint)]">
              {offset + 1}–{Math.min(offset + LIMIT, total)} von {total}
            </span>
            <div className="flex gap-2">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
              >
                ← Zurück
              </button>
              <button
                disabled={offset + LIMIT >= total}
                onClick={() => setOffset(offset + LIMIT)}
                className="btn-secondary px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Weiter →
              </button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined); }}
        title={editing ? 'Transaktion bearbeiten' : 'Neue Transaktion'}
      >
        <TransactionForm
          transaction={editing}
          onSuccess={() => { setShowForm(false); setEditing(undefined); load(); }}
          onCancel={() => { setShowForm(false); setEditing(undefined); }}
        />
      </Modal>
    </div>
  );
}
