import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, fixedCostsApi } from '../services/api';
import type { Subscription, CreateSubscriptionDto, SubscriptionInterval, SubscriptionCategory } from '../types';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate, today } from '../utils/format';
import Modal from '../components/ui/Modal';

const INTERVAL_LABEL: Record<SubscriptionInterval, string> = {
  monthly: 'Monatlich', quarterly: 'Vierteljährlich', yearly: 'Jährlich', irregular: 'Unregelmäßig',
};
const CATEGORIES: SubscriptionCategory[] = ['Streaming', 'Software', 'Wertkarte', 'Sonstige'];
const CATEGORY_ICON: Record<SubscriptionCategory, string> = {
  Streaming: '🎬', Software: '💻', Wertkarte: '💳', Sonstige: '📦',
};

const defaultForm: CreateSubscriptionDto = {
  name: '', amount: 0, interval: 'monthly', next_due_date: null, category: 'Sonstige', active: true, note: '',
};

function parseAmt(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

/** Monatsäquivalent – für die Kopfzeilen-Summe. 'irregular' hat keinen planbaren
 *  Betrag und zählt hier bewusst nicht mit. */
function monthlyEquivalent(sub: Subscription): number {
  switch (sub.interval) {
    case 'monthly': return sub.amount;
    case 'quarterly': return sub.amount / 3;
    case 'yearly': return sub.amount / 12;
    default: return 0;
  }
}

function daysUntil(dateStr: string): number {
  const ms = new Date(`${dateStr}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime();
  return Math.round(ms / 86_400_000);
}

export default function AbosPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subscription | null>(null);
  const [form, setForm] = useState<CreateSubscriptionDto>(defaultForm);
  const [amountRaw, setAmountRaw] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<SubscriptionCategory | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [loadingAmountRaw, setLoadingAmountRaw] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => subscriptionsApi.list().then(r => r.data.data),
  });
  const subs = data ?? [];

  // Hinweis: Sammelposten-Fixkosten "Abos" existiert noch neben den Einzelabos?
  const { data: fixedCosts } = useQuery({
    queryKey: ['fixed-costs'],
    queryFn: () => fixedCostsApi.list().then(r => r.data.data),
  });
  const legacyAboFixedCost = (fixedCosts ?? []).find(fc => fc.active && /^abos?$/i.test(fc.name.trim()));

  const active = subs.filter(s => s.active);
  const filtered = categoryFilter ? active.filter(s => s.category === categoryFilter) : active;
  const monthlySum = useMemo(() => active.reduce((a, s) => a + monthlyEquivalent(s), 0), [active]);
  const upcomingCount = active.filter(s => s.next_due_date && daysUntil(s.next_due_date) >= 0 && daysUntil(s.next_due_date) <= 7).length;

  const saveMutation = useMutation({
    mutationFn: (payload: CreateSubscriptionDto) =>
      editing ? subscriptionsApi.update(editing.id, payload) : subscriptionsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success(editing ? 'Gespeichert.' : 'Angelegt.');
      setShowForm(false); setEditing(null);
    },
    onError: () => toast.error('Speichern fehlgeschlagen.'),
  });

  const toggleMutation = useMutation({
    mutationFn: (s: Subscription) => subscriptionsApi.update(s.id, { active: !s.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
    onError: () => toast.error('Aktion fehlgeschlagen.'),
  });

  const addToPeriodMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => subscriptionsApi.addToCurrentPeriod(id, amount),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      toast.success('Im aktuellen Zeitraum als bezahlt erfasst.');
      setLoadingId(null); setLoadingAmountRaw('');
    },
    onError: () => toast.error('Fehlgeschlagen.'),
  });

  const openNew = () => { setEditing(null); setForm(defaultForm); setAmountRaw(''); setShowForm(true); };
  const openEdit = (s: Subscription) => {
    setEditing(s);
    setForm({ name: s.name, amount: s.amount, interval: s.interval, next_due_date: s.next_due_date, category: s.category, active: s.active, note: s.note });
    setAmountRaw(String(s.amount).replace('.', ','));
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmt(amountRaw);
    if (!form.name.trim()) { toast.error('Bitte einen Namen angeben.'); return; }
    if (!amount) { toast.error('Bitte einen gültigen Betrag angeben.'); return; }
    saveMutation.mutate({ ...form, amount });
  };

  const handleAddToPeriod = (id: string) => {
    const amount = parseAmt(loadingAmountRaw);
    if (!amount) { toast.error('Bitte einen gültigen Betrag angeben.'); return; }
    addToPeriodMutation.mutate({ id, amount });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-on-mount">
        <div>
          <h1 className="font-display text-3xl text-[var(--ink)]">Abos</h1>
          <p className="text-sm text-[var(--ink-faint)] mt-0.5">
            {formatCurrency(monthlySum)} / Monat · {formatCurrency(monthlySum * 12)} / Jahr
            {upcomingCount > 0 && (
              <span className="ml-2 text-[var(--warning)]">
                · {upcomingCount} Abbuchung{upcomingCount > 1 ? 'en' : ''} in den nächsten 7 Tagen
              </span>
            )}
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Abo</button>
      </div>

      {legacyAboFixedCost && (
        <div className="card p-4 border-2 border-[var(--warning)] bg-[var(--surface-overlay)] animate-on-mount">
          <p className="text-sm text-[var(--ink)]">
            ⚠ Es gibt noch den Fixkosten-Sammelposten „{legacyAboFixedCost.name}"
            ({formatCurrency(legacyAboFixedCost.amount)}). Wenn du hier alle Einzelabos angelegt hast, die darin
            zusammengefasst waren, solltest du ihn pausieren – sonst wird er zusätzlich zu den Einzelabos gerechnet.
          </p>
          <Link to="/fixkosten" className="text-sm text-[var(--accent)] hover:underline mt-1 inline-block">
            Zu den Fixkosten →
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2 animate-on-mount">
        <button onClick={() => setCategoryFilter(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
            ${categoryFilter === null ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)]'}`}>
          Alle
        </button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setCategoryFilter(c => c === cat ? null : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${categoryFilter === cat ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)]'}`}>
            {CATEGORY_ICON[cat]} {cat}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-[var(--border)] animate-on-mount">
        {isLoading ? (
          <div className="px-5 py-6 text-center text-sm text-[var(--ink-faint)]">Lädt…</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--ink-faint)]">Noch keine Abos hinterlegt.</div>
        ) : filtered.map(s => {
          const soon = s.next_due_date && daysUntil(s.next_due_date) >= 0 && daysUntil(s.next_due_date) <= 7;
          return (
            <div key={s.id} className={`px-5 py-3.5 space-y-2 ${soon ? 'border-l-2 border-amber-400' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--ink)] truncate">
                    {CATEGORY_ICON[s.category]} {s.name}
                  </div>
                  <div className="text-xs text-[var(--ink-faint)]">
                    {INTERVAL_LABEL[s.interval]}
                    {s.next_due_date && <> · nächste Abbuchung {formatDate(s.next_due_date)}{soon && ' ⚠'}</>}
                  </div>
                </div>
                <div className="font-mono text-sm text-[var(--ink)] shrink-0">{formatCurrency(s.amount)}</div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(s)} className="btn-ghost text-xs px-2 py-1">Bearbeiten</button>
                  <button onClick={() => toggleMutation.mutate(s)} className="btn-ghost text-xs px-2 py-1">Kündigen</button>
                </div>
              </div>

              {s.interval === 'irregular' && (
                loadingId === s.id ? (
                  <div className="flex items-center gap-2">
                    <input type="text" inputMode="decimal" autoFocus value={loadingAmountRaw}
                      onChange={e => setLoadingAmountRaw(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddToPeriod(s.id)}
                      placeholder="Betrag" className="input w-28 font-mono text-sm" />
                    <button onClick={() => handleAddToPeriod(s.id)} disabled={addToPeriodMutation.isPending}
                      className="btn-primary text-xs px-3 py-1.5">Erfassen</button>
                    <button onClick={() => { setLoadingId(null); setLoadingAmountRaw(''); }}
                      className="btn-ghost text-xs px-2 py-1">Abbrechen</button>
                  </div>
                ) : (
                  <button onClick={() => { setLoadingId(s.id); setLoadingAmountRaw(String(s.amount).replace('.', ',')); }}
                    className="btn-secondary text-xs px-3 py-1.5">
                    Jetzt aufgeladen – in diesen Zeitraum aufnehmen
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {subs.some(s => !s.active) && (
        <div className="card divide-y divide-[var(--border)] animate-on-mount opacity-70">
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink-faint)]">
            Gekündigt / pausiert
          </div>
          {subs.filter(s => !s.active).map(s => (
            <div key={s.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1 text-sm text-[var(--ink-muted)] truncate">{s.name}</div>
              <div className="font-mono text-sm text-[var(--ink-muted)]">{formatCurrency(s.amount)}</div>
              <button onClick={() => toggleMutation.mutate(s)} className="btn-ghost text-xs px-2 py-1 shrink-0">Reaktivieren</button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Abo bearbeiten' : 'Neues Abo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="z.B. Prime Video" />
          </div>
          <div>
            <label className="label">Betrag (€)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] font-mono">€</span>
              <input type="text" inputMode="decimal" required value={amountRaw}
                onChange={e => setAmountRaw(e.target.value)}
                className="input pl-8 font-mono text-lg" placeholder="0,00" />
            </div>
          </div>
          <div>
            <label className="label">Intervall</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(INTERVAL_LABEL) as SubscriptionInterval[]).map(iv => (
                <button key={iv} type="button" onClick={() => setForm(f => ({ ...f, interval: iv }))}
                  className={`py-2 px-3 rounded-[var(--radius-sm)] text-sm transition-all text-left border
                    ${form.interval === iv
                      ? 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]'
                      : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]'}`}>
                  {INTERVAL_LABEL[iv]}
                </button>
              ))}
            </div>
            {form.interval === 'irregular' && (
              <p className="text-xs text-[var(--ink-faint)] mt-1.5">
                Wird nie automatisch in einen Zeitraum übernommen – du erfasst Aufladungen manuell über den
                „Jetzt aufgeladen"-Button in der Liste.
              </p>
            )}
          </div>
          <div>
            <label className="label">Kategorie</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat} type="button" onClick={() => setForm(f => ({ ...f, category: cat }))}
                  className={`py-2 px-3 rounded-[var(--radius-sm)] text-sm transition-all text-left border
                    ${form.category === cat
                      ? 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]'
                      : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]'}`}>
                  {CATEGORY_ICON[cat]} {cat}
                </button>
              ))}
            </div>
          </div>
          {form.interval !== 'irregular' && (
            <div>
              <label className="label">Nächste Abbuchung</label>
              <input type="date" value={form.next_due_date ?? ''} min={today()}
                onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value || null }))}
                className="input" />
            </div>
          )}
          <div>
            <label className="label">Notiz (optional)</label>
            <input type="text" value={form.note ?? ''}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              className="input" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button type="submit" disabled={saveMutation.isPending} className="btn-primary flex-1">
              {saveMutation.isPending ? '...' : 'Speichern'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
