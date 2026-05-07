import { useState, useEffect } from 'react';
import { transactionsApi, categoriesApi } from '../../services/api';
import type { Category, Transaction, CreateTransactionDto } from '../../types';
import { today } from '../../utils/format';

interface TransactionFormProps {
  transaction?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function TransactionForm({ transaction, onSuccess, onCancel }: TransactionFormProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<CreateTransactionDto>({
    type: transaction?.type || 'expense',
    amount: transaction?.amount || 0,
    description: transaction?.description || '',
    category_id: transaction?.category_id || null,
    date: transaction?.date?.split('T')[0] || today(),
  });

  useEffect(() => {
    categoriesApi.list().then((res) => setCategories(res.data.data));
  }, []);

  const filteredCategories = categories.filter(
    (c) => c.type === form.type || c.type === 'both'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || form.amount <= 0) return;
    setLoading(true);
    try {
      if (transaction) {
        await transactionsApi.update(transaction.id, form);
      } else {
        await transactionsApi.create(form);
      }
      onSuccess();
    } catch (err) {
      console.error('Failed to save transaction', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type toggle */}
      <div>
        <label className="label">Typ</label>
        <div className="grid grid-cols-2 gap-2">
          {(['expense', 'income'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm({ ...form, type: t, category_id: null })}
              className={`py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all duration-150
                ${form.type === t
                  ? t === 'expense'
                    ? 'bg-[var(--danger)] text-white'
                    : 'bg-[var(--success)] text-white'
                  : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] hover:text-[var(--ink)]'
                }`}
            >
              {t === 'expense' ? '↑ Ausgabe' : '↓ Einnahme'}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="label">Betrag (€)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          value={form.amount || ''}
          onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
          className="input font-mono text-lg"
          placeholder="0,00"
        />
      </div>

      {/* Category */}
      <div>
        <label className="label">Kategorie</label>
        <select
          value={form.category_id || ''}
          onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}
          className="input"
        >
          <option value="">Keine Kategorie</option>
          {filteredCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="label">Datum</label>
        <input
          type="date"
          required
          value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })}
          className="input"
        />
      </div>

      {/* Description */}
      <div>
        <label className="label">Beschreibung</label>
        <input
          type="text"
          value={form.description || ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="input"
          placeholder="Optionale Notiz..."
          maxLength={500}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">
          Abbrechen
        </button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading ? '...' : transaction ? 'Speichern' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  );
}
