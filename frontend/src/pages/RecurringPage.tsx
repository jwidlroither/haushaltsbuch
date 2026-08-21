import { useState, useEffect, useCallback } from 'react';
import { recurringApi } from '../services/api';
import type { RecurringTransaction, UpcomingPreviewItem } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';
import RecurringForm from '../components/recurring/RecurringForm';

const INTERVAL_LABEL: Record<string,string> = {
  monthly:'Monatlich', weekly:'Wöchentlich', yearly:'Jährlich', quarterly:'Vierteljährlich'
};

export default function RecurringPage() {
  const { toast } = useToast();
  const [items, setItems]     = useState<RecurringTransaction[]>([]);
  const [preview, setPreview] = useState<UpcomingPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]   = useState<RecurringTransaction | undefined>();
  const [tab, setTab] = useState<'list'|'preview'>('list');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [lr, pr] = await Promise.all([recurringApi.list(), recurringApi.preview(3)]);
      setItems(lr.data.data);
      setPreview(pr.data.data);
    } catch { toast.error('Laden fehlgeschlagen.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!confirm('Wirklich löschen?')) return;
    try { await recurringApi.delete(id); toast.success('Gelöscht.'); load(); }
    catch { toast.error('Löschen fehlgeschlagen.'); }
  };

  const handleToggle = async (r: RecurringTransaction) => {
    try {
      await recurringApi.toggle(r.id);
      toast.success(r.is_active ? 'Pausiert.' : 'Aktiviert.');
      load();
    } catch { toast.error('Aktion fehlgeschlagen.'); }
  };

  const handleMaterialize = async () => {
    const now = new Date();
    try {
      const res = await recurringApi.materialize(now.getMonth()+1, now.getFullYear());
      toast.success(`${res.data.created} Buchung(en) für diesen Monat erstellt.`);
      load();
    } catch { toast.error('Fehler.'); }
  };

  const active   = items.filter(i => i.is_active);
  const inactive = items.filter(i => !i.is_active);
  const monthlyExpense = active
    .filter(i => i.type==='expense' && i.interval==='monthly')
    .reduce((s,i) => s+Number(i.amount), 0);

  // Group preview by month
  const previewByMonth = preview.reduce((acc, item) => {
    const key = item.date.substring(0,7);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, UpcomingPreviewItem[]>);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between animate-on-mount">
        <div>
          <h1 className="font-display text-3xl text-[var(--ink)]">Wiederkehrend</h1>
          {monthlyExpense > 0 && (
            <p className="text-sm text-[var(--ink-muted)] mt-0.5">
              Monatliche Fixkosten:{' '}
              <span className="font-mono text-[var(--danger)] font-semibold">−{formatCurrency(monthlyExpense)}</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleMaterialize} className="btn-secondary text-sm" title="Ausstehende Buchungen für diesen Monat jetzt anlegen">
            ↻ Jetzt anlegen
          </button>
          <button onClick={() => { setEditing(undefined); setShowForm(true); }} className="btn-primary">
            + Neu
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface-overlay)] rounded-lg p-0.5 animate-on-mount stagger-1">
        {(['list','preview'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all
              ${tab===t ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}>
            {t==='list' ? '📋 Meine Buchungen' : '🔮 Vorschau (3 Monate)'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : tab==='list' ? (
        <>
          <div className="card animate-on-mount stagger-2">
            <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="font-display text-[var(--ink)]">Aktiv</h3>
              <span className="badge bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">{active.length}</span>
            </div>
            {active.length === 0 ? (
              <div className="text-center py-10 text-[var(--ink-faint)] text-sm">
                Noch keine aktiven Buchungen.{' '}
                <button onClick={() => setShowForm(true)} className="text-[var(--accent)] hover:underline">Erste anlegen</button>
              </div>
            ) : active.map((item, i) => (
              <RecurringRow key={item.id} item={item} index={i}
                onEdit={() => { setEditing(item); setShowForm(true); }}
                onDelete={() => handleDelete(item.id)}
                onToggle={() => handleToggle(item)} />
            ))}
          </div>

          {inactive.length > 0 && (
            <div className="card animate-on-mount stagger-3 opacity-60 hover:opacity-100 transition-opacity">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h3 className="font-display text-[var(--ink)]">Pausiert</h3>
                <span className="badge bg-[var(--surface-overlay)] text-[var(--ink-faint)]">{inactive.length}</span>
              </div>
              {inactive.map((item, i) => (
                <RecurringRow key={item.id} item={item} index={i}
                  onEdit={() => { setEditing(item); setShowForm(true); }}
                  onDelete={() => handleDelete(item.id)}
                  onToggle={() => handleToggle(item)} />
              ))}
            </div>
          )}
        </>
      ) : (
        /* Preview */
        <div className="space-y-4 animate-on-mount stagger-2">
          {Object.entries(previewByMonth).length === 0 ? (
            <div className="card text-center py-10 text-[var(--ink-faint)] text-sm">
              Keine aktiven Buchungen für die Vorschau.
            </div>
          ) : Object.entries(previewByMonth).map(([monthKey, monthItems]) => {
            const [year, month] = monthKey.split('-').map(Number);
            const monthName = new Date(year, month-1).toLocaleDateString('de-AT', { month:'long', year:'numeric' });
            const total = monthItems.reduce((s,i) => s + (i.type==='expense' ? -i.amount : i.amount), 0);
            return (
              <div key={monthKey} className="card">
                <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <h4 className="font-medium text-[var(--ink)]">{monthName}</h4>
                  <span className={`font-mono text-sm font-semibold ${total>=0?'amount-positive':'amount-negative'}`}>
                    {total>=0?'+':''}{formatCurrency(total)}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {monthItems.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--surface-overlay)] transition-colors">
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
                        style={{ background: item.category_color ? `${item.category_color}22` : 'var(--surface-overlay)' }}>
                        {item.category_icon ?? '📦'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--ink)] truncate">
                          {item.description ?? item.category_name ?? '—'}
                        </div>
                        <div className="text-xs text-[var(--ink-faint)]">{formatDate(item.date)}</div>
                      </div>
                      <span className={`font-mono text-sm font-semibold tabular-nums shrink-0
                        ${item.type==='income'?'amount-positive':'amount-negative'}`}>
                        {item.type==='income'?'+':'−'}{formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setEditing(undefined); }}
        title={editing ? 'Buchung bearbeiten' : 'Wiederkehrende Buchung anlegen'} size="md">
        <RecurringForm
          recurring={editing}
          onSuccess={() => { setShowForm(false); setEditing(undefined); load(); }}
          onCancel={() => { setShowForm(false); setEditing(undefined); }} />
      </Modal>
    </div>
  );
}

function RecurringRow({ item, index, onEdit, onDelete, onToggle }: {
  item: RecurringTransaction; index: number;
  onEdit: ()=>void; onDelete: ()=>void; onToggle: ()=>void;
}) {
  return (
    <div className="group flex items-center gap-3 px-4 py-3.5 hover:bg-[var(--surface-overlay)]
      transition-colors animate-on-mount border-b border-[var(--border)] last:border-0"
      style={{ animationDelay: `${index*0.04}s` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0"
        style={{ background: item.category_color ? `${item.category_color}22` : 'var(--surface-overlay)' }}>
        {item.category_icon ?? '📦'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-[var(--ink)] truncate">
            {item.description ?? item.category_name ?? '—'}
          </span>
          <span className="badge bg-[var(--surface-overlay)] text-[var(--ink-faint)] text-[10px]">
            {INTERVAL_LABEL[item.interval]}
            {item.day_of_month && item.interval!=='weekly' ? ` · ${item.day_of_month}.` : ''}
          </span>
        </div>
        {item.end_date && (
          <p className="text-xs text-amber-500 mt-0.5">Endet {formatDate(item.end_date)}</p>
        )}
      </div>
      <span className={`font-mono text-sm font-semibold tabular-nums shrink-0
        ${item.type==='income'?'amount-positive':'amount-negative'}`}>
        {item.type==='income'?'+':'−'}{formatCurrency(Number(item.amount))}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onToggle} title={item.is_active?'Pausieren':'Aktivieren'}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-xs
            text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-all">
          {item.is_active ? '⏸' : '▶'}
        </button>
        <button onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-xs
            text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--border)] transition-all">✎</button>
        <button onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-sm
            text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">×</button>
      </div>
    </div>
  );
}
