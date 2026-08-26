import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { transactionsApi, categoriesApi } from '../../services/api';
import type { Category } from '../../types';
import { today, formatCurrency } from '../../utils/format';
import { useToast } from '../../context/ToastContext';
import Modal from './Modal';

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];

/**
 * Globaler `+` Floating Action Button für die Schnelleingabe.
 * Öffnet ein Bottom-Sheet (auf Desktop zentriert) mit Numpad-Betragseingabe,
 * Typ-Toggle, horizontalem Kategorie-Scroll, Beschreibung und Datum.
 * Smart-Defaults: Typ = Ausgabe, Datum = heute, Status = bezahlt.
 */
export default function QuickAddFAB() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [digits, setDigits] = useState(''); // Numpad-Eingabe, z.B. "1250" -> 12,50
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.list().then(r => r.data.data),
    enabled: open,
  });
  const categories: Category[] = data ?? [];
  const filteredCategories = categories.filter(c => c.type === type || c.type === 'both');

  const amount = digits ? parseInt(digits, 10) / 100 : 0;

  const pressKey = (key: string) => {
    if (key === '⌫') { setDigits(d => d.slice(0, -1)); return; }
    if (key === ',') return; // Komma ist rein visuell – Nachkommastellen entstehen automatisch
    setDigits(d => (d.length >= 8 ? d : `${d}${key}`.replace(/^0+(?=\d)/, '')));
  };

  const reset = () => {
    setType('expense'); setDigits(''); setCategoryId(null);
    setDescription(''); setDate(today());
  };

  const handleClose = () => { setOpen(false); reset(); };

  const handleSubmit = async () => {
    if (amount <= 0) { toast.error('Bitte einen Betrag eingeben.'); return; }
    setSaving(true);
    try {
      await transactionsApi.create({
        type, amount, description: description || undefined,
        category_id: categoryId, date, status: 'bezahlt',
      });
      toast.success('Transaktion hinzugefügt.');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      // Dashboard/Transaktionen-Seiten laden bei diesem Event neu (kein React-Query-Cache dort)
      window.dispatchEvent(new CustomEvent('hb:tx-changed'));
      handleClose();
    } catch {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Neue Transaktion (Schnelleingabe)"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full
          bg-[var(--accent)] text-white text-2xl font-light
          flex items-center justify-center shadow-modal
          hover:bg-[var(--accent-hover)] active:scale-90
          transition-all duration-150"
      >
        +
      </button>

      <Modal isOpen={open} onClose={handleClose} title="Schnelleingabe" size="sm">
        <div className="space-y-5">
          {/* Typ-Toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(['expense', 'income'] as const).map(t => (
              <button key={t} type="button"
                onClick={() => { setType(t); setCategoryId(null); }}
                className={`py-2.5 rounded-[var(--radius-sm)] text-sm font-medium transition-all
                  ${type === t
                    ? t === 'expense' ? 'bg-[var(--danger)] text-white' : 'bg-[var(--success)] text-white'
                    : 'bg-[var(--surface-overlay)] text-[var(--ink-muted)] hover:text-[var(--ink)]'}`}>
                {t === 'expense' ? '↑ Ausgabe' : '↓ Einnahme'}
              </button>
            ))}
          </div>

          {/* Großer Betrags-Display */}
          <div className={`text-center font-mono font-bold tabular-nums text-5xl py-2
            ${type === 'expense' ? 'text-[var(--danger)]' : 'text-[var(--success)]'}`}>
            {digits ? formatCurrency(amount) : '€ 0,00'}
          </div>

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map(key => (
              <button key={key} type="button" onClick={() => pressKey(key)}
                className="py-3.5 rounded-[var(--radius-sm)] text-lg font-medium
                  bg-[var(--surface-overlay)] text-[var(--ink)]
                  hover:bg-[var(--border)] active:scale-95 transition-all duration-100">
                {key}
              </button>
            ))}
          </div>

          {/* Kategorie – horizontales Icon-Scroll */}
          <div>
            <label className="label">Kategorie</label>
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {filteredCategories.map(c => (
                <button key={c.id} type="button"
                  onClick={() => setCategoryId(prev => prev === c.id ? null : c.id)}
                  className={`shrink-0 flex flex-col items-center gap-1 w-16 py-2 rounded-[var(--radius-sm)]
                    border transition-all
                    ${categoryId === c.id
                      ? 'border-[var(--accent)] bg-[var(--accent-muted)]'
                      : 'border-[var(--border)] hover:border-[var(--accent)]'}`}>
                  <span className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
                    style={{ background: `${c.color}22` }}>{c.icon}</span>
                  <span className="text-[10px] text-[var(--ink-muted)] truncate w-full text-center">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="label">Beschreibung</label>
            <input type="text" value={description} maxLength={500}
              onChange={e => setDescription(e.target.value)}
              className="input" placeholder="Optionale Notiz..." />
          </div>

          {/* Datum */}
          <div>
            <label className="label">Datum</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={handleClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSubmit} disabled={saving || amount <= 0} className="btn-primary flex-1">
              {saving ? '...' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
