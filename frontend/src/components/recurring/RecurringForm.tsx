import { useState, useEffect } from 'react';
import { recurringApi, categoriesApi } from '../../services/api';
import type { Category, RecurringTransaction, CreateRecurringDto, RecurringInterval } from '../../types';
import { today } from '../../utils/format';
import { useToast } from '../../context/ToastContext';

const INTERVALS: { value: RecurringInterval; label: string; icon: string }[] = [
  { value: 'monthly',   label: 'Monatlich',       icon: '📅' },
  { value: 'weekly',    label: 'Wöchentlich',      icon: '📆' },
  { value: 'yearly',    label: 'Jährlich',         icon: '🗓️' },
  { value: 'quarterly', label: 'Vierteljährlich',  icon: '📊' },
];

interface Props { recurring?: RecurringTransaction; onSuccess: () => void; onCancel: () => void; }
const parseAmt = (s: string) => parseFloat(s.replace(',', '.')) || 0;

export default function RecurringForm({ recurring, onSuccess, onCancel }: Props) {
  const { toast } = useToast();
  const [cats, setCats] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [amtRaw, setAmtRaw] = useState(recurring?.amount ? String(recurring.amount).replace('.', ',') : '');
  const [form, setForm] = useState<Omit<CreateRecurringDto, 'amount'>>({
    type:         recurring?.type         ?? 'expense',
    description:  recurring?.description  ?? '',
    category_id:  recurring?.category_id  ?? null,
    interval:     recurring?.interval     ?? 'monthly',
    day_of_month: recurring?.day_of_month ?? 1,
    start_date:   recurring?.start_date?.split('T')[0] ?? today(),
    end_date:     recurring?.end_date?.split('T')[0]   ?? null,
  });

  useEffect(() => { categoriesApi.list().then(r => setCats(r.data.data)); }, []);
  const filteredCats = cats.filter(c => c.type === form.type || c.type === 'both');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmt(amtRaw);
    if (!amount) { toast.error('Bitte gültigen Betrag eingeben.'); return; }
    setSaving(true);
    try {
      if (recurring) await recurringApi.update(recurring.id, { ...form, amount });
      else           await recurringApi.create({ ...form, amount });
      toast.success(recurring ? 'Gespeichert.' : 'Anlegt.');
      onSuccess();
    } catch { toast.error('Fehler beim Speichern.'); }
    finally { setSaving(false); }
  };

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Type */}
      <div>
        <label className="label">Typ</label>
        <div className="grid grid-cols-2 gap-2">
          {(['expense','income'] as const).map(t => (
            <button key={t} type="button" onClick={() => set({ type: t, category_id: null })}
              className={`py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all
                ${form.type===t ? (t==='expense' ? 'bg-[var(--danger)] text-white' : 'bg-[var(--success)] text-white')
                  : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
              {t==='expense' ? '↑ Ausgabe' : '↓ Einnahme'}
            </button>
          ))}
        </div>
      </div>

      {/* Amount */}
      <div>
        <label className="label">Betrag (€)</label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] font-mono">€</span>
          <input type="text" inputMode="decimal" required value={amtRaw}
            onChange={e => setAmtRaw(e.target.value)}
            onBlur={e => { const v=parseAmt(e.target.value); if(v>0) setAmtRaw(v.toFixed(2).replace('.',',')); }}
            className="input pl-8 font-mono text-lg" placeholder="0,00" />
        </div>
      </div>

      {/* Interval */}
      <div>
        <label className="label">Intervall</label>
        <div className="grid grid-cols-2 gap-2">
          {INTERVALS.map(({ value, label, icon }) => (
            <button key={value} type="button" onClick={() => set({ interval: value })}
              className={`py-2 px-3 rounded-[var(--radius-sm)] text-sm transition-all text-left border
                ${form.interval===value
                  ? 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]'
                  : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]'}`}>
              {icon} {label}
            </button>
          ))}
        </div>
      </div>

      {/* Day of month */}
      {form.interval !== 'weekly' && (
        <div>
          <label className="label">Tag des Monats</label>
          <input type="number" min={1} max={31} value={form.day_of_month ?? 1}
            onChange={e => set({ day_of_month: parseInt(e.target.value) || 1 })}
            className="input" />
          <p className="text-xs text-[var(--ink-faint)] mt-1">
            Wird bei kurzen Monaten automatisch angepasst (z.B. 31.→28./29. Feb)
          </p>
        </div>
      )}

      {/* Category + Description */}
      <div>
        <label className="label">Kategorie</label>
        <select value={form.category_id || ''} onChange={e => set({ category_id: e.target.value || null })} className="input">
          <option value="">Keine Kategorie</option>
          {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Beschreibung</label>
        <input type="text" value={form.description ?? ''} maxLength={500}
          onChange={e => set({ description: e.target.value })}
          className="input" placeholder="z.B. Miete, Netflix, Gehalt..." />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Startdatum</label>
          <input type="date" required value={form.start_date} onChange={e => set({ start_date: e.target.value })} className="input" />
        </div>
        <div>
          <label className="label">Enddatum (optional)</label>
          <input type="date" value={form.end_date ?? ''} onChange={e => set({ end_date: e.target.value || null })} className="input" />
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="btn-secondary flex-1">Abbrechen</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? '...' : recurring ? 'Speichern' : 'Anlegen'}
        </button>
      </div>
    </form>
  );
}
