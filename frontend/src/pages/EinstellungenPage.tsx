import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tokensApi, transactionsApi, downloadExport } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatDate, formatMonth, currentMonth } from '../utils/format';
import type { CreatedApiToken } from '../types';

const CONFIRM_WORD = 'LÖSCHEN';

export default function EinstellungenPage() {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl text-[var(--ink)] animate-on-mount">Einstellungen</h1>

      <ProfilSection />
      <ZahltagSection />
      <TokensSection />
      <KategorienSection />
      <ExportSection />
      <DangerZone />
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="card animate-on-mount">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
        <span>{icon}</span>
        <h2 className="font-display text-[var(--ink)]">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ── Profil (read-only, kommt von OIDC/Pocket ID) ──────────────
function ProfilSection() {
  const { user } = useAuth();
  return (
    <Section title="Profil" icon="👤">
      <p className="text-xs text-[var(--ink-faint)] mb-4">
        Diese Angaben stammen von deinem Single-Sign-On-Provider (Pocket ID / OIDC) und können hier nicht geändert werden.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">Name</label>
          <div className="input bg-[var(--surface-overlay)] cursor-not-allowed">{user?.name || '—'}</div>
        </div>
        <div>
          <label className="label">E-Mail</label>
          <div className="input bg-[var(--surface-overlay)] cursor-not-allowed">{user?.email || '—'}</div>
        </div>
      </div>
    </Section>
  );
}

// ── Zahltag – zentrale, DB-gestützte Einstellung ──────────────
function ZahltagSection() {
  const { payday, setPayday } = useAuth();
  const { toast } = useToast();
  const [value, setValue] = useState(String(payday ?? 27));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const pd = parseInt(value, 10);
    if (!(pd >= 1 && pd <= 31)) { toast.error('Bitte einen Tag zwischen 1 und 31 angeben.'); return; }
    setSaving(true);
    try {
      await setPayday(pd);
      toast.success('Zahltag gespeichert.');
    } catch {
      toast.error('Speichern fehlgeschlagen.');
    } finally { setSaving(false); }
  };

  return (
    <Section title="Zahltag" icon="📅">
      <p className="text-xs text-[var(--ink-faint)] mb-4">
        Bestimmt, ob das Tagesbudget „bis zum Zahltag" oder „bis Monatsende" reicht – wird auf dem Dashboard verwendet.
      </p>
      <div className="flex items-center gap-3">
        <input type="number" min="1" max="31" value={value}
          onChange={e => setValue(e.target.value)}
          className="input w-24 font-mono text-lg text-center" />
        <span className="text-sm text-[var(--ink-muted)]">Tag des Monats</span>
        <button onClick={handleSave} disabled={saving} className="btn-primary ml-auto">
          {saving ? '...' : 'Speichern'}
        </button>
      </div>
    </Section>
  );
}

// ── API-Tokens ─────────────────────────────────────────────────
function TokensSection() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [nameInput, setNameInput] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<CreatedApiToken | null>(null);
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['tokens'],
    queryFn: () => tokensApi.list().then(r => r.data.data),
  });
  const tokens = data ?? [];

  const createMutation = useMutation({
    mutationFn: (name: string) => tokensApi.create(name || undefined).then(r => r.data.data),
    onSuccess: (token) => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      setJustCreated(token);
      setShowCreate(false);
      setNameInput('');
    },
    onError: () => toast.error('Token konnte nicht erstellt werden.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => tokensApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tokens'] });
      toast.success('Token gelöscht.');
    },
    onError: () => toast.error('Löschen fehlgeschlagen.'),
  });

  const handleDelete = (id: string, name: string | null) => {
    if (!confirm(`Token "${name || 'Unbenannt'}" wirklich löschen? Geräte, die ihn nutzen, verlieren den Zugriff.`)) return;
    deleteMutation.mutate(id);
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kopieren nicht möglich – bitte manuell markieren.');
    }
  };

  return (
    <Section title="API-Tokens" icon="🔑">
      <p className="text-xs text-[var(--ink-faint)] mb-4">
        Für den Zugriff durch die iOS-App oder andere Clients. Der Klartext-Token wird nur einmal direkt nach dem Erstellen angezeigt.
      </p>

      {/* Neu erstellter Token – einmalige Anzeige */}
      {justCreated && (
        <div className="mb-4 p-4 rounded-xl border-2 border-[var(--accent)] bg-[var(--accent-muted)] space-y-2">
          <p className="text-xs font-semibold text-[var(--accent)]">
            ⚠ Dieser Token wird nicht erneut angezeigt – jetzt kopieren!
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 min-w-0 truncate text-xs font-mono bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-2">
              {justCreated.token}
            </code>
            <button onClick={() => handleCopy(justCreated.token)} className="btn-primary text-xs px-3 py-2 shrink-0">
              {copied ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>
          <button onClick={() => setJustCreated(null)} className="text-xs text-[var(--ink-faint)] hover:underline">
            Schließen
          </button>
        </div>
      )}

      {/* Token erstellen */}
      {showCreate ? (
        <div className="mb-4 flex items-center gap-2">
          <input type="text" value={nameInput} onChange={e => setNameInput(e.target.value)}
            placeholder="Name (optional, z.B. „iPhone“)" className="input flex-1" maxLength={100}
            autoFocus onKeyDown={e => e.key === 'Enter' && createMutation.mutate(nameInput)} />
          <button onClick={() => createMutation.mutate(nameInput)} disabled={createMutation.isPending}
            className="btn-primary text-sm px-3">
            {createMutation.isPending ? '...' : 'Erstellen'}
          </button>
          <button onClick={() => { setShowCreate(false); setNameInput(''); }} className="btn-ghost text-sm px-3">
            Abbrechen
          </button>
        </div>
      ) : (
        <button onClick={() => setShowCreate(true)} className="btn-secondary text-sm mb-4">
          + Neuen Token erstellen
        </button>
      )}

      {/* Liste */}
      {isLoading ? (
        <div className="text-sm text-[var(--ink-faint)]">Lädt…</div>
      ) : tokens.length === 0 ? (
        <div className="text-sm text-[var(--ink-faint)] text-center py-6 border border-dashed border-[var(--border)] rounded-lg">
          Noch keine API-Tokens erstellt.
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {tokens.map(t => (
            <div key={t.id} className="flex items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--ink)] truncate">{t.name || 'Unbenannt'}</div>
                <div className="text-xs text-[var(--ink-faint)]">
                  Erstellt {formatDate(t.created_at)} · {t.last_used ? `zuletzt genutzt ${formatDate(t.last_used)}` : 'nie benutzt'}
                </div>
              </div>
              <button onClick={() => handleDelete(t.id, t.name)}
                className="btn-ghost text-xs px-3 py-1.5 text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 shrink-0">
                Löschen
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ── Kategorien verwalten – Link zur bestehenden Seite ─────────
function KategorienSection() {
  return (
    <Section title="Kategorien verwalten" icon="⊞">
      <p className="text-xs text-[var(--ink-faint)] mb-4">
        Kategorien anlegen, bearbeiten und löschen passiert weiterhin auf der Kategorien-Seite.
      </p>
      <Link to="/categories" className="btn-secondary inline-flex">
        Zu den Kategorien →
      </Link>
    </Section>
  );
}

// ── Daten exportieren ──────────────────────────────────────────
function ExportSection() {
  const { toast } = useToast();
  const [{ month, year }, setMonthYear] = useState(currentMonth());

  return (
    <Section title="Daten exportieren" icon="⬇">
      <p className="text-xs text-[var(--ink-faint)] mb-4">
        Exportiert alle Transaktionen des gewählten Monats.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <select value={month} onChange={e => setMonthYear(v => ({ ...v, month: Number(e.target.value) }))} className="input w-auto text-sm">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <option key={m} value={m}>{formatMonth(m, year).split(' ')[0]}</option>
          ))}
        </select>
        <input type="number" value={year} onChange={e => setMonthYear(v => ({ ...v, year: Number(e.target.value) }))}
          className="input w-24 text-sm" />
        <button onClick={() => downloadExport('csv', { month, year }).catch(() => toast.error('CSV-Export fehlgeschlagen.'))}
          className="btn-secondary text-sm">↓ CSV</button>
        <button onClick={() => downloadExport('pdf', { month, year }).catch(() => toast.error('PDF-Export fehlgeschlagen.'))}
          className="btn-secondary text-sm">↓ PDF</button>
      </div>
    </Section>
  );
}

// ── Danger Zone ────────────────────────────────────────────────
function DangerZone() {
  const { toast } = useToast();
  const [{ month, year }, setMonthYear] = useState(currentMonth());
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await transactionsApi.deleteMonth(month, year);
      toast.success(`${res.data.deleted} Transaktion(en) aus ${formatMonth(month, year)} gelöscht.`);
      setConfirming(false);
      setConfirmText('');
    } catch {
      toast.error('Löschen fehlgeschlagen.');
    } finally { setDeleting(false); }
  };

  return (
    <div className="card border-2 border-[var(--danger)] animate-on-mount">
      <div className="px-5 py-4 border-b flex items-center gap-2"
        style={{ borderColor: 'color-mix(in srgb, var(--danger) 30%, transparent)' }}>
        <span>⚠</span>
        <h2 className="font-display text-[var(--danger)]">Danger Zone</h2>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <p className="text-sm font-medium text-[var(--ink)] mb-1">Alle Transaktionen eines Monats löschen</p>
          <p className="text-xs text-[var(--ink-faint)]">
            Diese Aktion ist unwiderruflich und entfernt alle Ein- und Ausgaben des gewählten Monats endgültig.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={month} onChange={e => setMonthYear(v => ({ ...v, month: Number(e.target.value) }))} className="input w-auto text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>{formatMonth(m, year).split(' ')[0]}</option>
            ))}
          </select>
          <input type="number" value={year} onChange={e => setMonthYear(v => ({ ...v, year: Number(e.target.value) }))}
            className="input w-24 text-sm" />
          {!confirming && (
            <button onClick={() => setConfirming(true)} className="btn-danger text-sm ml-auto">
              Alle Transaktionen dieses Monats löschen
            </button>
          )}
        </div>

        {confirming && (
          <div className="p-4 rounded-xl border-2 border-[var(--danger)] bg-[var(--danger-muted)] space-y-3">
            <p className="text-sm text-[var(--ink)]">
              Tippe <strong>{CONFIRM_WORD}</strong> ein, um das endgültige Löschen aller Transaktionen aus{' '}
              <strong>{formatMonth(month, year)}</strong> zu bestätigen.
            </p>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              className="input font-mono" placeholder={CONFIRM_WORD} autoFocus />
            <div className="flex gap-3">
              <button onClick={() => { setConfirming(false); setConfirmText(''); }} className="btn-secondary flex-1">
                Abbrechen
              </button>
              <button onClick={handleDelete} disabled={confirmText !== CONFIRM_WORD || deleting}
                className="btn-danger flex-1 disabled:opacity-40">
                {deleting ? '...' : 'Endgültig löschen'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
