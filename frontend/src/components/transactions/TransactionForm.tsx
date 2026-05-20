import { useState, useEffect } from 'react';
import { transactionsApi, categoriesApi } from '../../services/api';
import type { Category, Transaction, CreateTransactionDto, TransactionStatus } from '../../types';
import { today } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

interface Props {
  transaction?: Transaction;
  onSuccess: () => void;
  onCancel: () => void;
}

/** Parse a DE-formatted number string (comma as decimal separator) */
function parseAmount(raw: string): number {
  return parseFloat(raw.replace(',', '.')) || 0;
}

export default function TransactionForm({ transaction, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [amountRaw, setAmountRaw] = useState(
    transaction?.amount ? String(transaction.amount).replace('.', ',') : ''
  );
  const [form, setForm] = useState<Omit<CreateTransactionDto, 'amount'>>({
    type:        transaction?.type        || 'expense',
    description: transaction?.description || '',
    category_id: transaction?.category_id || null,
    date:        transaction?.date?.split('T')[0] || today(),
    status:      (transaction?.status as TransactionStatus) || 'bezahlt',
  });

  useEffect(() => {
    categoriesApi.list().then(r => setCategories(r.data.data));
  }, []);

  const filteredCategories = categories.filter(c => c.type === form.type || c.type === 'both');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmount(amountRaw);
    if (!amount || amount <= 0) {
      toast.error('Bitte gib einen gültigen Betrag ein.');
      return;
    }
    setLoading(true);
    try {
      const payload: CreateTransactionDto = { ...form, amount };
      if (transaction) await transactionsApi.update(transaction.id, payload);
      else await transactionsApi.create(payload);
      toast.success(transaction ? 'Transaktion gespeichert.' : 'Transaktion hinzugefügt.');
      onSuccess();
    } catch {
      toast.error('Fehler beim Speichern. Bitte erneut versuchen.');
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
          {(['expense', 'income'] as const).map(t => (
            <button key={t} type="button"
              onClick={() => setForm({ ...form, type: t, category_id: null,
                status: t === 'income' ? 'bezahlt' : form.status })}
              className={`py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all
                ${form.type === t
                  ? t === 'expense' ? 'bg-[var(--danger)] text-white' : 'bg-[var(--success)] text-white'
                  : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
              {t === 'expense' ? '↑ Ausgabe' : '↓ Einnahme'}
            </button>
          ))}
        </div>
      </div>

      {/* Status – nur bei Ausgaben */}
      {form.type === 'expense' && (
        <div>
          <label className="label">Status</label>
          <div className="grid grid-cols-2 gap-2">
            {(['bezahlt', 'ausstehend'] as const).map(s => (
              <button key={s} type="button"
                onClick={() => setForm({ ...form, status: s })}
                className={`py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all
                  flex items-center justify-center gap-2
                  ${form.status === s
                    ? s === 'bezahlt' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                    : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
                {s === 'bezahlt' ? '✓ Bezahlt' : '⏳ Ausstehend'}
              </button>
            ))}
          </div>
          {form.status === 'ausstehend' && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
              Wird im Budget als „noch ausstehend" eingerechnet
            </p>
          )}
        </div>
      )}

      {/* Amount – accepts both 1.50 and 1,50 */}
      <div>
        <label className="label">Betrag (€)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] font-mono">€</span>
          <input
            type="text"
            inputMode="decimal"
            required
            value={amountRaw}
            onChange={e => setAmountRaw(e.target.value)}
            onBlur={e => {
              const v = parseAmount(e.target.value);
              if (v > 0) setAmountRaw(v.toFixed(2).replace('.', ','));
            }}
            className="input pl-8 font-mono text-lg"
            placeholder="0,00"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="label">Kategorie</label>
        <select value={form.category_id || ''}
          onChange={e => setForm({ ...form, category_id: e.target.value || null })}
          className="input">
          <option value="">Keine Kategorie</option>
          {filteredCategories.map(c => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
      </div>

      {/* Date */}
      <div>
        <label className="label">Datum</label>
        <input type="date" required value={form.date}
          onChange={e => setForm({ ...form, date: e.target.value })}
          className="input" />
      </div>

      {/* Description */}
      <div>
        <label className="label">Beschreibung</label>
        <input type="text" value={form.description || ''}
          onChange={e => setForm({ ...form, description: e.target.value })}
          className="input" placeholder="Optionale Notiz..." maxLength={500} />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={loading} className="btn-primary flex-1">
          {loading
            ? <span className="flex items-center gap-2 justify-center">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                Speichern...
              </span>
            : transaction ? 'Speichern' : 'Hinzufügen'}
        </button>
      </div>
    </form>
  );
}
