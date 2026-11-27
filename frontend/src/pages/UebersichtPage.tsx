import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { periodsApi, periodItemsApi, transactionsApi } from '../services/api';
import type { PeriodOverview, PeriodItem, Transaction } from '../types';
import PeriodHero from '../components/period/PeriodHero';
import PeriodSection from '../components/period/PeriodSection';
import PeriodItemRow from '../components/period/PeriodItemRow';
import NestedAbosRow from '../components/period/NestedAbosRow';
import TransactionItem from '../components/transactions/TransactionItem';
import Modal from '../components/ui/Modal';
import TransactionForm from '../components/transactions/TransactionForm';
import { DashboardSkeleton } from '../components/ui/Skeleton';

export default function UebersichtPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [overview, setOverview] = useState<PeriodOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Transaction | undefined>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await periodsApi.current();
      setOverview(res.data);
    } catch { toast.error('Übersicht konnte nicht geladen werden.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    window.addEventListener('hb:tx-changed', load);
    return () => window.removeEventListener('hb:tx-changed', load);
  }, [load]);

  // PWA-Shortcut ("Neue Ausgabe", siehe manifest.json) verlinkt auf /?action=new
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('action') === 'new') {
      setShowForm(true);
    }
  }, []);

  const handleTogglePaid = async (item: PeriodItem) => {
    try {
      await periodItemsApi.update(item.id, { paid: !item.paid });
      load();
    } catch { toast.error('Aktion fehlgeschlagen.'); }
  };

  const handleChangeAmount = async (item: PeriodItem, amount: number) => {
    try {
      await periodItemsApi.update(item.id, { planned_amount: amount });
      toast.success('Betrag für diesen Zeitraum angepasst.');
      load();
    } catch { toast.error('Speichern fehlgeschlagen.'); }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Ausgabe wirklich löschen?')) return;
    try { await transactionsApi.delete(id); toast.success('Gelöscht.'); load(); }
    catch { toast.error('Löschen fehlgeschlagen.'); }
  };

  const handleMarkExpensePaid = async (id: string) => {
    try { await transactionsApi.markPaid(id); toast.success('Als bezahlt markiert ✓'); load(); }
    catch { toast.error('Aktion fehlgeschlagen.'); }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  if (loading && !overview) return <DashboardSkeleton />;
  if (!overview) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="flex items-start justify-between animate-on-mount">
        <div>
          <p className="text-sm text-[var(--ink-faint)]">{greeting},</p>
          <h1 className="font-display text-3xl text-[var(--ink)] mt-0.5">
            {user?.name?.split(' ')[0] || 'Willkommen'}
          </h1>
        </div>
        <button onClick={() => { setEditing(undefined); setShowForm(true); }} className="btn-primary">
          + Ausgabe
        </button>
      </div>

      <PeriodHero overview={overview} />

      <PeriodSection
        title="Fixkosten" icon="📌"
        planned={overview.fixedCosts.planned} paid={overview.fixedCosts.paid}
        isEmpty={overview.fixedCosts.items.length === 0}
        emptyLabel="Noch keine Fixkosten hinterlegt – unter „Fixkosten” anlegen."
      >
        {overview.fixedCosts.items.filter(i => i.source_type === 'fixed').map(item => (
          <PeriodItemRow key={item.id} item={item} onTogglePaid={handleTogglePaid} onChangeAmount={handleChangeAmount} />
        ))}
        <NestedAbosRow
          items={overview.fixedCosts.items.filter(i => i.source_type === 'subscription')}
          onTogglePaid={handleTogglePaid} onChangeAmount={handleChangeAmount}
        />
      </PeriodSection>

      <PeriodSection
        title="Rückzahlungen" icon="↩"
        planned={overview.debts.planned} paid={overview.debts.paid}
        isEmpty={overview.debts.items.length === 0}
        emptyLabel="Noch keine Rückzahlungen hinterlegt – unter „Rückzahlungen” anlegen."
      >
        {overview.debts.items.map(item => (
          <PeriodItemRow key={item.id} item={item} onTogglePaid={handleTogglePaid} onChangeAmount={handleChangeAmount} />
        ))}
      </PeriodSection>

      <PeriodSection
        title="Schon ausgegeben" icon="🧾"
        planned={overview.expenses.planned} paid={overview.expenses.paid}
        isEmpty={overview.expenses.items.length === 0}
        emptyLabel="Noch keine Ausgaben in diesem Zeitraum."
      >
        {overview.expenses.items.map((t, i) => (
          <TransactionItem key={t.id} transaction={t} index={i}
            onEdit={tx => { setEditing(tx); setShowForm(true); }}
            onDelete={handleDeleteExpense} onMarkPaid={handleMarkExpensePaid} />
        ))}
      </PeriodSection>

      <Modal isOpen={showForm}
        onClose={() => { setShowForm(false); setEditing(undefined); }}
        title={editing ? 'Transaktion bearbeiten' : 'Neue Ausgabe'}>
        <TransactionForm transaction={editing}
          onSuccess={() => { setShowForm(false); setEditing(undefined); load(); }}
          onCancel={() => { setShowForm(false); setEditing(undefined); }} />
      </Modal>
    </div>
  );
}
