import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fixedCostsApi } from '../services/api';
import type { FixedCost, CreateFixedCostDto } from '../types';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/format';
import Modal from '../components/ui/Modal';

const defaultForm: CreateFixedCostDto = { name: '', amount: 0, due_day: null, active: true, note: '' };

function parseAmt(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

export default function FixkostenPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FixedCost | null>(null);
  const [form, setForm] = useState<CreateFixedCostDto>(defaultForm);
  const [amountRaw, setAmountRaw] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['fixed-costs'],
    queryFn: () => fixedCostsApi.list().then(r => r.data.data),
  });
  const items = data ?? [];
  const active = items.filter(i => i.active);
  const inactive = items.filter(i => !i.active);
  const totalActive = active.reduce((a, i) => a + i.amount, 0);

  const saveMutation = useMutation({
    mutationFn: (payload: CreateFixedCostDto) =>
      editing ? fixedCostsApi.update(editing.id, payload) : fixedCostsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fixed-costs'] });
      toast.success(editing ? 'Gespeichert.' : 'Angelegt.');
      setShowForm(false); setEditing(null);
    },
    onError: () => toast.error('Speichern fehlgeschlagen.'),
  });

  const toggleMutation = useMutation({
    mutationFn: (fc: FixedCost) => fixedCostsApi.update(fc.id, { active: !fc.active }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fixed-costs'] }); },
    onError: () => toast.error('Aktion fehlgeschlagen.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fixedCostsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['fixed-costs'] }); toast.success('Gelöscht.'); },
    onError: () => toast.error('Löschen fehlgeschlagen.'),
  });

  const openNew = () => { setEditing(null); setForm(defaultForm); setAmountRaw(''); setShowForm(true); };
  const openEdit = (fc: FixedCost) => {
    setEditing(fc);
    setForm({ name: fc.name, amount: fc.amount, due_day: fc.due_day, active: fc.active, note: fc.note });
    setAmountRaw(String(fc.amount).replace('.', ','));
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseAmt(amountRaw);
    if (!form.name.trim()) { toast.error('Bitte einen Namen angeben.'); return; }
    if (!amount) { toast.error('Bitte einen gültigen Betrag angeben.'); return; }
    saveMutation.mutate({ ...form, amount });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Fixkosten-Eintrag wirklich löschen? Vergangene Zeiträume bleiben davon unberührt.')) return;
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-on-mount">
        <div>
          <h1 className="font-display text-3xl text-[var(--ink)]">Fixkosten</h1>
          <p className="text-sm text-[var(--ink-faint)] mt-0.5">
            {active.length} aktiv · {formatCurrency(totalActive)} pro Zeitraum
          </p>
        </div>
        <button onClick={openNew} className="btn-primary">+ Fixkosten</button>
      </div>

      <div className="card divide-y divide-[var(--border)] animate-on-mount">
        {isLoading ? (
          <div className="px-5 py-6 text-center text-sm text-[var(--ink-faint)]">Lädt…</div>
        ) : active.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-[var(--ink-faint)]">
            Noch keine Fixkosten hinterlegt.
          </div>
        ) : active.map(fc => (
          <div key={fc.id} className="flex items-center gap-3 px-5 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-[var(--ink)] truncate">{fc.name}</div>
              {fc.due_day && <div className="text-xs text-[var(--ink-faint)]">fällig am {fc.due_day}.</div>}
            </div>
            <div className="font-mono text-sm text-[var(--ink)]">{formatCurrency(fc.amount)}</div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => openEdit(fc)} className="btn-ghost text-xs px-2 py-1">Bearbeiten</button>
              <button onClick={() => toggleMutation.mutate(fc)} className="btn-ghost text-xs px-2 py-1">Pausieren</button>
              <button onClick={() => handleDelete(fc.id)} className="btn-ghost text-xs px-2 py-1 text-[var(--danger)]">Löschen</button>
            </div>
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="card divide-y divide-[var(--border)] animate-on-mount opacity-70">
          <div className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[var(--ink-faint)]">
            Pausiert
          </div>
          {inactive.map(fc => (
            <div key={fc.id} className="flex items-center gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1 text-sm text-[var(--ink-muted)] truncate">{fc.name}</div>
              <div className="font-mono text-sm text-[var(--ink-muted)]">{formatCurrency(fc.amount)}</div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={() => toggleMutation.mutate(fc)} className="btn-ghost text-xs px-2 py-1">Aktivieren</button>
                <button onClick={() => handleDelete(fc.id)} className="btn-ghost text-xs px-2 py-1 text-[var(--danger)]">Löschen</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-[var(--ink-faint)] text-center">
        Jährliche, vierteljährliche oder wöchentliche Buchungen passen nicht in dieses
        „fester Betrag pro Zeitraum"-Modell – die verwaltest du weiterhin unter{' '}
        <Link to="/recurring" className="text-[var(--accent)] hover:underline">Wiederkehrend</Link>.
      </p>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editing ? 'Fixkosten bearbeiten' : 'Neue Fixkosten'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" required value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="input" placeholder="z.B. Autoversicherung" />
          </div>
          <div>
            <label className="label">Betrag pro Zeitraum (€)</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] font-mono">€</span>
              <input type="text" inputMode="decimal" required value={amountRaw}
                onChange={e => setAmountRaw(e.target.value)}
                className="input pl-8 font-mono text-lg" placeholder="0,00" />
            </div>
          </div>
          <div>
            <label className="label">Fälligkeitstag (optional)</label>
            <input type="number" min={1} max={31} value={form.due_day ?? ''}
              onChange={e => setForm(f => ({ ...f, due_day: e.target.value ? Number(e.target.value) : null }))}
              className="input w-24" placeholder="—" />
          </div>
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
