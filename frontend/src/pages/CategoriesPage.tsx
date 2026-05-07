import { useState, useEffect, useCallback } from 'react';
import { categoriesApi } from '../services/api';
import type { Category, CreateCategoryDto } from '../types';
import Modal from '../components/ui/Modal';

const ICONS = ['🛒','🏠','🚗','💊','🎮','🍽️','👗','📚','🛡️','🏡','💻','✈️','🏋️','📦','💼','💡','📈','🏘️','🎁','💰','🎵','🌱','🐾','☕','🎨','🔧','🎓','🏥','🚀','⭐'];
const COLORS = ['#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#f97316','#ec4899','#06b6d4','#64748b','#84cc16','#0ea5e9','#14b8a6','#a855f7','#94a3b8','#16a34a','#2563eb','#d97706','#059669','#db2777','#7c3aed'];

const defaultForm: CreateCategoryDto = { name: '', icon: '📦', color: '#6366f1', type: 'both' };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<CreateCategoryDto>(defaultForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesApi.list();
      setCategories(res.data.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(defaultForm); setShowForm(true); };
  const openEdit = (c: Category) => {
    setEditing(c);
    setForm({ name: c.name, icon: c.icon, color: c.color, type: c.type });
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) await categoriesApi.update(editing.id, form);
      else await categoriesApi.create(form);
      setShowForm(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Kategorie wirklich löschen? Transaktionen werden nicht gelöscht.')) return;
    await categoriesApi.delete(id);
    load();
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense' || c.type === 'both');
  const incomeCategories = categories.filter((c) => c.type === 'income' || c.type === 'both');

  const CategoryGrid = ({ items, title }: { items: Category[]; title: string }) => (
    <div className="card animate-on-mount stagger-1">
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="font-display text-[var(--ink)]">{title}</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4">
        {items.map((c, i) => (
          <div
            key={c.id}
            className="group relative flex items-center gap-2.5 p-3 rounded-[var(--radius-sm)]
              border border-[var(--border)] hover:border-[var(--accent)] hover:shadow-card
              transition-all duration-150 cursor-pointer animate-on-mount"
            style={{ animationDelay: `${i * 0.02}s` }}
            onClick={() => !c.is_system && openEdit(c)}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
              style={{ background: `${c.color}22`, color: c.color }}
            >
              {c.icon}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-medium text-[var(--ink)] truncate">{c.name}</div>
              {c.is_system && (
                <div className="text-[10px] text-[var(--ink-faint)]">System</div>
              )}
            </div>
            {!c.is_system && (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                className="absolute top-1 right-1 w-5 h-5 flex items-center justify-center
                  rounded opacity-0 group-hover:opacity-100 transition-opacity
                  text-[var(--ink-faint)] hover:text-[var(--danger)] text-xs"
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between animate-on-mount">
        <h1 className="font-display text-3xl text-[var(--ink)]">Kategorien</h1>
        <button onClick={openNew} className="btn-primary">+ Neu</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <CategoryGrid items={expenseCategories} title="Ausgaben-Kategorien" />
          <CategoryGrid items={incomeCategories} title="Einnahmen-Kategorien" />
        </>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Kategorie bearbeiten' : 'Neue Kategorie'}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              placeholder="Kategoriename"
            />
          </div>

          <div>
            <label className="label">Typ</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CreateCategoryDto['type'] })}
              className="input"
            >
              <option value="expense">Ausgabe</option>
              <option value="income">Einnahme</option>
              <option value="both">Beides</option>
            </select>
          </div>

          <div>
            <label className="label">Symbol</label>
            <div className="grid grid-cols-10 gap-1 p-2 bg-[var(--surface-overlay)] rounded-[var(--radius-sm)]">
              {ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm({ ...form, icon })}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all
                    ${form.icon === icon ? 'bg-[var(--accent)] scale-110' : 'hover:bg-[var(--surface)]'}`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Farbe</label>
            <div className="grid grid-cols-10 gap-1.5">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm({ ...form, color })}
                  className={`w-6 h-6 rounded-full transition-all ${form.color === color ? 'scale-125 ring-2 ring-offset-1 ring-[var(--accent)]' : 'hover:scale-110'}`}
                  style={{ background: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
              Abbrechen
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">
              {saving ? '...' : editing ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
