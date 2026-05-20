import { useState, useEffect } from 'react';
import { budgetApi } from '../../services/api';
import type { Budget, Category } from '../../types';
import { formatCurrency } from '../../utils/format';
import Modal from './Modal';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  month: number;
  year: number;
  categories: Category[];
  onSaved: () => void;
}

export default function BudgetModal({ isOpen, onClose, month, year, categories, onSaved }: BudgetModalProps) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [totalAmount, setTotalAmount] = useState('');
  const [catAmounts, setCatAmounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'total' | 'category'>('total');

  useEffect(() => {
    if (!isOpen) return;
    budgetApi.list(month, year).then(res => {
      const data = res.data.data;
      setBudgets(data);
      const total = data.find(b => !b.category_id);
      if (total) setTotalAmount(String(total.amount));
      const catMap: Record<string, string> = {};
      data.filter(b => b.category_id).forEach(b => {
        catMap[b.category_id!] = String(b.amount);
      });
      setCatAmounts(catMap);
    });
  }, [isOpen, month, year]);

  const handleSaveTotal = async () => {
    if (!totalAmount || parseFloat(totalAmount) <= 0) return;
    setSaving(true);
    try {
      await budgetApi.upsert({ category_id: null, month, year, amount: parseFloat(totalAmount) });
      onSaved();
      onClose();
    } finally { setSaving(false); }
  };

  const handleSaveCat = async (categoryId: string) => {
    const val = catAmounts[categoryId];
    if (!val || parseFloat(val) <= 0) return;
    setSaving(true);
    try {
      await budgetApi.upsert({ category_id: categoryId, month, year, amount: parseFloat(val) });
      onSaved();
    } finally { setSaving(false); }
  };

  const handleDeleteBudget = async (id: string) => {
    await budgetApi.delete(id);
    onSaved();
    budgetApi.list(month, year).then(res => setBudgets(res.data.data));
  };

  const expenseCategories = categories.filter(c => c.type === 'expense' || c.type === 'both');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Budget festlegen" size="md">
      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--surface-overlay)] rounded-lg p-0.5 mb-5">
        {(['total', 'category'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all
              ${activeTab === tab ? 'bg-[var(--surface)] text-[var(--ink)] shadow-sm' : 'text-[var(--ink-muted)]'}`}>
            {tab === 'total' ? '🎯 Gesamtbudget' : '📂 Pro Kategorie'}
          </button>
        ))}
      </div>

      {activeTab === 'total' ? (
        <div className="space-y-4">
          <p className="text-sm text-[var(--ink-muted)]">
            Lege ein monatliches Gesamtbudget für Ausgaben fest. Dieses wird als Basis für
            die Budget-Anzeige verwendet.
          </p>
          <div>
            <label className="label">Gesamtbudget (€)</label>
            <input
              type="number" step="0.01" min="1"
              value={totalAmount}
              onChange={e => setTotalAmount(e.target.value)}
              className="input font-mono text-lg"
              placeholder="z.B. 2000"
            />
          </div>
          {budgets.find(b => !b.category_id) && (
            <p className="text-xs text-[var(--ink-faint)]">
              Aktuell: {formatCurrency(budgets.find(b => !b.category_id)!.amount)}
              <button
                onClick={() => handleDeleteBudget(budgets.find(b => !b.category_id)!.id)}
                className="ml-2 text-[var(--danger)] hover:underline">
                Löschen
              </button>
            </p>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary flex-1">Abbrechen</button>
            <button onClick={handleSaveTotal} disabled={saving} className="btn-primary flex-1">
              {saving ? '...' : 'Speichern'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {expenseCategories.map(cat => {
            const existing = budgets.find(b => b.category_id === cat.id);
            return (
              <div key={cat.id} className="flex items-center gap-3 p-3 rounded-[var(--radius-sm)]
                border border-[var(--border)] hover:border-[var(--accent)] transition-all">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
                  style={{ background: `${cat.color}22` }}>
                  {cat.icon}
                </div>
                <span className="text-sm font-medium text-[var(--ink)] flex-1">{cat.name}</span>
                <input
                  type="number" step="0.01" min="1"
                  value={catAmounts[cat.id] ?? ''}
                  onChange={e => setCatAmounts(p => ({ ...p, [cat.id]: e.target.value }))}
                  className="input w-28 text-right font-mono text-sm py-1.5"
                  placeholder="0,00 €"
                />
                <button
                  onClick={() => handleSaveCat(cat.id)}
                  disabled={saving || !catAmounts[cat.id]}
                  className="btn-primary px-3 py-1.5 text-xs disabled:opacity-40">
                  ✓
                </button>
                {existing && (
                  <button onClick={() => handleDeleteBudget(existing.id)}
                    className="text-[var(--danger)] text-lg hover:opacity-70">×</button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
