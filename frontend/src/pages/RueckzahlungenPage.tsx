import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtsApi } from '../services/api';
import type { Debt, CreateDebtDto, CreditorType } from '../types';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/ui/Modal';

const CREDITOR_GROUPS: { key: CreditorType; label: string }[] = [
  { key: 'privat',    label: 'Privat' },
  { key: 'inkasso',   label: 'Inkasso' },
  { key: 'ratenkauf', label: 'Klarna / Ratenkauf' },
  { key: 'sonstige',  label: 'Sonstige' },
];

const defaultForm: CreateDebtDto = {
  name: '', creditor_type: 'privat', monthly_rate: null, remaining_amount: null, due_day: null, active: true, note: '',
};

function parseAmt(s: string): number | null {
  if (!s.trim()) return null;
  return parseFloat(s.replace(',', '.')) || 0;
}

export default function RueckzahlungenPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Debt | null>(null);
  const [form, setForm] = useState<CreateDebtDto>(defaultForm);
  const [rateRaw, setRateRaw] = useState('');
  const [remainingRaw, setRemainingRaw] = useState('');
  const [payingId, setPayingId] = useState<string | null>(null);
  const [paymentRaw, setPaymentRaw] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: () => debtsApi.list().then(r => r.data.data),
  });
  const debts = (data ?? []).filter(d => d.active);
  const totalRemaining = debts.reduce((a, d) => a + (d.remaining_amount ?? 0), 0);

  const saveMutation = useMutation({
    mutationFn: (payload: CreateDebtDto) => editing ? debtsApi.update(editing.id, payload) : debtsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success(editing ? 'Gespeichert.' : 'Angelegt.');
      setShowForm(false); setEditing(null);
    },
    onError: () => toast.error('Speichern fehlgeschlagen.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => debtsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['debts'] }); toast.success('Gelöscht.'); },
    onError: () => toast.error('Löschen fehlgeschlagen.'),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) => debtsApi.payment(id, amount),
    onSuccess: (_res, vars) => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      toast.success(`${formatCurrency(vars.amount)} verbucht.`);
      setPayingId(null); setPaymentRaw('');
    },
    onError: () => toast.error('Sonderzahlung fehlgeschlagen.'),
  });

  const openNew = () => { setEditing(null); setForm(defaultForm); setRateRaw(''); setRemainingRaw(''); setShowForm(true); };
  const openEdit = (d: Debt) => {
    setEditing(d);
    setForm({
      name: d.name, creditor_type: d.creditor_type, monthly_rate: d.monthly_rate,
      remaining_amount: d.remaining_amount, due_day: d.due_day, active: d.active, note: null,
    });
    setRateRaw(d.monthly_rate !== null ? String(d.monthly_rate).replace('.', ',') : '');
    setRemainingRaw(d.remaining_amount !== null ? String(d.remaining_amount).replace('.', ',') : '');
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Bitte einen Namen angeben.'); return; }
    saveMutation.mutate({ ...form, monthly_rate: parseAmt(rateRaw), remaining_amount: parseAmt(remainingRaw) });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Rückzahlung wirklich löschen?')) return;
    deleteMutation.mutate(id);
  };

  const handlePay = (id: string) => {
    const amount = parseAmt(paymentRaw);
    if (!amount || amount <= 0) { toast.error('Bitte einen gültigen Betrag angeben.'); return; }
    paymentMutation.mutate({ id, amount });
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-on-mount">
        <div>
          <h1 className="font-display text-3xl text-[var(--ink)]">Rückzahlungen</h1>
          <p className="text-sm text-[var(--ink-faint)] mt-0.5">
            Gesamtrestschuld <span className="font-mono text-[var(--ink)]">{formatCurrency(totalRemaining)}</span>
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Rückzahlung</button>
      </div>

      {isLoading ? (
        <div className="card px-5 py-6 text-center text-sm text-[var(--ink-faint)]">Lädt…</div>
      ) : debts.length === 0 ? (
        <div className="card px-5 py-8 text-center text-sm text-[var(--ink-faint)]">Noch keine Rückzahlungen hinterlegt.</div>
      ) : CREDITOR_GROUPS.map(group => {
        const groupItems = debts.filter(d => d.creditor_type === group.key);
        if (!groupItems.length) return null;
        return (
          <div key={group.key} className="space-y-2 animate-on-mount">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-[var(--ink-faint)] px-1">
              {group.label}
            </h2>
            <div className="card divide-y divide-[var(--border)]">
              {groupItems.map(d => (
                <div key={d.id} className="px-5 py-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-[var(--ink)] truncate">{d.name}</div>
                      <div className="text-xs text-[var(--ink-faint)]">
                        {d.monthly_rate !== null && <>Rate {formatCurrency(d.monthly_rate)} · </>}
                        {d.remaining_amount !== null
                          ? <>Rest {formatCurrency(d.remaining_amount)}</>
                          : 'kein Restbetrag hinterlegt'}
                        {d.projected_payoff_date && <> · fertig ca. {formatDate(d.projected_payoff_date, 'MMM yyyy')}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(d)} className="btn-ghost text-xs px-2 py-1">Bearbeiten</button>
                      <button onClick={() => setPayingId(payingId === d.id ? null : d.id)} className="btn-ghost text-xs px-2 py-1">
                        Sonderzahlung
                      </button>
                      <button onClick={() => handleDelete(d.id)} className="btn-ghost text-xs px-2 py-1 text-[var(--danger)]">Löschen</button>
                    </div>
                  </div>

                  {d.progress_percent !== null && (
                    <div className="h-1.5 rounded-full bg-[var(--surface-overlay)] overflow-hidden">
                      <div className="h-full bg-[var(--accent)]" style={{ width: `${d.progress_percent}%` }} />
                    </div>
                  )}

                  {payingId === d.id && (
                    <div className="flex items-center gap-2 pt-1">
                      <input type="text" inputMode="decimal" autoFocus value={paymentRaw}
                        onChange={e => setPaymentRaw(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handlePay(d.id)}
                        placeholder="Betrag" className="input w-28 font-mono text-sm" />
                      <button onClick={() => handlePay(d.id)} disabled={paymentMutation.isPending} className="btn-primary text-xs px-3 py-1.5">
                        Verbuchen
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Rückzahlung bearbeiten' : 'Neue Rückzahlung'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="z.B. Mama" />
          </div>
          <div>
            <label className="label">Art</label>
            <div className="grid grid-cols-2 gap-2">
              {CREDITOR_GROUPS.map(({ key, label }) => (
                <button key={key} type="button" onClick={() => setForm(f => ({ ...f, creditor_type: key }))}
                  className={`py-2 px-3 rounded-[var(--radius-sm)] text-sm transition-all text-left border
                    ${form.creditor_type === key
                      ? 'bg-[var(--accent-muted)] text-[var(--accent)] border-[var(--accent)]'
                      : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] border-transparent hover:text-[var(--ink)]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rate pro Zeitraum (optional)</label>
              <input type="text" inputMode="decimal" value={rateRaw}
                onChange={e => setRateRaw(e.target.value)}
                className="input font-mono" placeholder="z.B. bei Klarna leer lassen" />
            </div>
            <div>
              <label className="label">Restbetrag (optional)</label>
              <input type="text" inputMode="decimal" value={remainingRaw}
                onChange={e => setRemainingRaw(e.target.value)}
                className="input font-mono" placeholder="—" />
            </div>
          </div>
          <div>
            <label className="label">Fälligkeitstag (optional)</label>
            <input type="number" min={1} max={31} value={form.due_day ?? ''}
              onChange={e => setForm(f => ({ ...f, due_day: e.target.value ? Number(e.target.value) : null }))}
              className="input w-24" placeholder="—" />
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
