import { useState, useEffect, useCallback } from 'react';
import { goalsApi } from '../services/api';
import type { SavingsGoal, CreateGoalDto } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { useToast } from '../context/ToastContext';
import Modal from '../components/ui/Modal';

const ICONS = ['🎯','🏠','✈️','🚗','💻','📚','💍','🎓','🏋️','🎵','🌴','💰','🛒','🎁','🐾','🏖️','🍕','📷'];
const COLORS = ['#6366f1','#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316','#0ea5e9'];

function parseAmt(s: string) { return parseFloat(s.replace(',','.')) || 0; }

export default function GoalsPage() {
  const { toast } = useToast();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showDeposit, setShowDeposit] = useState<SavingsGoal|null>(null);
  const [editing, setEditing] = useState<SavingsGoal|undefined>();
  const [depositAmt, setDepositAmt] = useState('');

  // Form state
  const [form, setForm] = useState<CreateGoalDto>({
    name:'', icon:'🎯', color:'#6366f1', target_amount:0, current_amount:0, deadline:null, notes:null
  });
  const [targetRaw, setTargetRaw] = useState('');
  const [currentRaw, setCurrentRaw] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setGoals((await goalsApi.list()).data.data); }
    catch { toast.error('Laden fehlgeschlagen.'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(undefined);
    setForm({ name:'', icon:'🎯', color:'#6366f1', target_amount:0, current_amount:0, deadline:null, notes:null });
    setTargetRaw(''); setCurrentRaw('');
    setShowForm(true);
  };

  const openEdit = (g: SavingsGoal) => {
    setEditing(g);
    setForm({ name:g.name, icon:g.icon, color:g.color, target_amount:g.target_amount,
      current_amount:g.current_amount, deadline:g.deadline, notes:g.notes });
    setTargetRaw(g.target_amount.toFixed(2).replace('.',','));
    setCurrentRaw(g.current_amount.toFixed(2).replace('.',','));
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const ta = parseAmt(targetRaw), ca = parseAmt(currentRaw);
    if (!form.name.trim() || ta <= 0) { toast.error('Name und Zielbetrag sind Pflichtfelder.'); return; }
    try {
      const payload = { ...form, target_amount: ta, current_amount: ca };
      if (editing) await goalsApi.update(editing.id, payload);
      else await goalsApi.create(payload);
      toast.success(editing ? 'Gespeichert.' : 'Ziel angelegt!');
      setShowForm(false); load();
    } catch { toast.error('Fehler beim Speichern.'); }
  };

  const handleDeposit = async () => {
    if (!showDeposit) return;
    const amt = parseAmt(depositAmt);
    if (!amt) { toast.error('Bitte Betrag eingeben.'); return; }
    try {
      const res = await goalsApi.deposit(showDeposit.id, amt);
      if (res.data.completed) toast.success('🎉 Ziel erreicht! Herzlichen Glückwunsch!');
      else toast.success(`${formatCurrency(amt)} eingetragen.`);
      setShowDeposit(null); setDepositAmt(''); load();
    } catch { toast.error('Fehler.'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Ziel wirklich löschen?')) return;
    try { await goalsApi.delete(id); toast.success('Gelöscht.'); load(); }
    catch { toast.error('Löschen fehlgeschlagen.'); }
  };

  const active    = goals.filter(g => !g.is_completed);
  const completed = goals.filter(g => g.is_completed);
  const totalSaved = active.reduce((s,g) => s + Number(g.current_amount), 0);
  const totalNeeded = active.reduce((s,g) => s + Number(g.target_amount), 0);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between animate-on-mount">
        <div>
          <h1 className="font-display text-3xl text-[var(--ink)]">Sparziele</h1>
          {active.length > 0 && (
            <p className="text-sm text-[var(--ink-muted)] mt-0.5">
              <span className="font-mono text-[var(--success)] font-semibold">{formatCurrency(totalSaved)}</span>
              {' '}von{' '}
              <span className="font-mono font-semibold">{formatCurrency(totalNeeded)}</span>
              {' '}gespart
            </p>
          )}
        </div>
        <button onClick={openNew} className="btn-primary">+ Neues Ziel</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : (
        <>
          {/* Active goals */}
          {active.length === 0 ? (
            <div className="card text-center py-16 animate-on-mount stagger-1">
              <div className="text-5xl mb-4">🎯</div>
              <p className="text-[var(--ink-muted)] text-sm mb-4">
                Noch keine Sparziele. Lege dein erstes Ziel an!
              </p>
              <button onClick={openNew} className="btn-primary mx-auto">Erstes Ziel anlegen</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {active.map((goal, i) => (
                <GoalCard key={goal.id} goal={goal} index={i}
                  onDeposit={() => { setShowDeposit(goal); setDepositAmt(''); }}
                  onEdit={() => openEdit(goal)}
                  onDelete={() => handleDelete(goal.id)} />
              ))}
            </div>
          )}

          {/* Completed goals */}
          {completed.length > 0 && (
            <div className="card animate-on-mount stagger-3">
              <div className="px-5 py-4 border-b border-[var(--border)] flex items-center gap-2">
                <span>🏆</span>
                <h3 className="font-display text-[var(--ink)]">Erreichte Ziele</h3>
                <span className="badge bg-[var(--surface-overlay)] text-[var(--ink-faint)]">{completed.length}</span>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {completed.map(goal => (
                  <div key={goal.id} className="flex items-center gap-3 px-5 py-3 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                      style={{ background: `${goal.color}22` }}>{goal.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-[var(--ink)] truncate">{goal.name}</div>
                      <div className="text-xs text-[var(--success)]">✓ {formatCurrency(Number(goal.target_amount))} erreicht</div>
                    </div>
                    <button onClick={() => handleDelete(goal.id)}
                      className="text-[var(--ink-faint)] hover:text-[var(--danger)] text-lg transition-colors">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Goal Form Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)}
        title={editing ? 'Ziel bearbeiten' : 'Neues Sparziel'} size="md">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Name</label>
            <input type="text" required value={form.name} maxLength={200}
              onChange={e => setForm(f=>({...f,name:e.target.value}))}
              className="input" placeholder="z.B. Urlaub, Auto, Notgroschen..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Zielbetrag (€)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] font-mono">€</span>
                <input type="text" inputMode="decimal" required value={targetRaw}
                  onChange={e=>setTargetRaw(e.target.value)}
                  onBlur={e=>{const v=parseAmt(e.target.value);if(v>0)setTargetRaw(v.toFixed(2).replace('.',','));}}
                  className="input pl-8 font-mono" placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="label">Bereits gespart (€)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] font-mono">€</span>
                <input type="text" inputMode="decimal" value={currentRaw}
                  onChange={e=>setCurrentRaw(e.target.value)}
                  onBlur={e=>{const v=parseAmt(e.target.value);if(v>=0)setCurrentRaw(v.toFixed(2).replace('.',','));}}
                  className="input pl-8 font-mono" placeholder="0,00" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Symbol</label>
            <div className="grid grid-cols-9 gap-1 p-2 bg-[var(--surface-overlay)] rounded-[var(--radius-sm)]">
              {ICONS.map(icon => (
                <button key={icon} type="button" onClick={()=>setForm(f=>({...f,icon}))}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all
                    ${form.icon===icon ? 'bg-[var(--accent)] scale-110' : 'hover:bg-[var(--surface)]'}`}>
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Farbe</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map(color => (
                <button key={color} type="button" onClick={()=>setForm(f=>({...f,color}))}
                  className={`w-6 h-6 rounded-full transition-all ${form.color===color?'scale-125 ring-2 ring-offset-1 ring-[var(--accent)]':'hover:scale-110'}`}
                  style={{ background: color }} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Zieldatum (optional)</label>
              <input type="date" value={form.deadline ?? ''}
                onChange={e=>setForm(f=>({...f,deadline:e.target.value||null}))}
                className="input" />
            </div>
            <div>
              <label className="label">Notizen</label>
              <input type="text" value={form.notes ?? ''} maxLength={500}
                onChange={e=>setForm(f=>({...f,notes:e.target.value||null}))}
                className="input" placeholder="Optional..." />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={()=>setShowForm(false)} className="btn-secondary flex-1">Abbrechen</button>
            <button type="submit" className="btn-primary flex-1">{editing?'Speichern':'Anlegen'}</button>
          </div>
        </form>
      </Modal>

      {/* Deposit Modal */}
      <Modal isOpen={!!showDeposit} onClose={()=>{setShowDeposit(null);setDepositAmt('');}}
        title={`Einzahlung: ${showDeposit?.name}`} size="sm">
        {showDeposit && (
          <div className="space-y-4">
            <div className="p-3 rounded-[var(--radius-sm)] bg-[var(--surface-overlay)]">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-[var(--ink-muted)]">Fortschritt</span>
                <span className="font-mono font-medium">{formatCurrency(Number(showDeposit.current_amount))} / {formatCurrency(Number(showDeposit.target_amount))}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width:`${showDeposit.progress_percent}%`, background: showDeposit.color }} />
              </div>
              <div className="text-xs text-[var(--ink-faint)] mt-1 text-right">
                {showDeposit.progress_percent}% · noch {formatCurrency(Number(showDeposit.target_amount)-Number(showDeposit.current_amount))} bis zum Ziel
              </div>
            </div>
            <div>
              <label className="label">Betrag einzahlen (€)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ink-faint)] font-mono">€</span>
                <input type="text" inputMode="decimal" autoFocus value={depositAmt}
                  onChange={e=>setDepositAmt(e.target.value)}
                  onBlur={e=>{const v=parseAmt(e.target.value);if(v>0)setDepositAmt(v.toFixed(2).replace('.',','));}}
                  onKeyDown={e=>e.key==='Enter'&&handleDeposit()}
                  className="input pl-8 font-mono text-lg" placeholder="0,00" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>{setShowDeposit(null);setDepositAmt('');}} className="btn-secondary flex-1">Abbrechen</button>
              <button onClick={handleDeposit} className="btn-primary flex-1">+ Einzahlen</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function GoalCard({ goal, index, onDeposit, onEdit, onDelete }: {
  goal: SavingsGoal; index: number;
  onDeposit:()=>void; onEdit:()=>void; onDelete:()=>void;
}) {
  const remaining = Number(goal.target_amount) - Number(goal.current_amount);
  const pct = Math.min(100, Number(goal.progress_percent));
  const urgent = goal.deadline && Number(goal.days_remaining) <= 30;

  return (
    <div className="card-hover p-5 animate-on-mount" style={{ animationDelay:`${index*0.06}s` }}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background:`${goal.color}22` }}>{goal.icon}</div>
          <div>
            <div className="font-medium text-[var(--ink)]">{goal.name}</div>
            {goal.deadline && (
              <div className={`text-xs ${urgent?'text-amber-500':'text-[var(--ink-faint)]'}`}>
                {urgent && '⚠️ '}Bis {formatDate(goal.deadline)}
                {goal.days_remaining != null && ` · ${Math.round(Number(goal.days_remaining))} Tage`}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button onClick={onEdit} className="w-7 h-7 flex items-center justify-center rounded-lg
            text-xs text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--surface-overlay)] transition-all">✎</button>
          <button onClick={onDelete} className="w-7 h-7 flex items-center justify-center rounded-lg
            text-sm text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">×</button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-2.5 rounded-full bg-[var(--surface-overlay)] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width:`${pct}%`, background: goal.color }} />
        </div>
        <div className="flex items-center justify-between mt-1.5 text-xs">
          <span className="font-mono font-semibold" style={{ color: goal.color }}>
            {formatCurrency(Number(goal.current_amount))}
          </span>
          <span className="text-[var(--ink-faint)]">{pct}%</span>
          <span className="font-mono text-[var(--ink-muted)]">{formatCurrency(Number(goal.target_amount))}</span>
        </div>
      </div>

      {/* Bottom */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--ink-faint)]">
          Noch <span className="font-mono font-medium text-[var(--ink)]">{formatCurrency(remaining)}</span>
        </span>
        <button onClick={onDeposit} className="btn-primary py-1.5 px-3 text-xs">
          + Einzahlen
        </button>
      </div>

      {/* Notes */}
      {goal.notes && (
        <p className="text-xs text-[var(--ink-faint)] mt-2 pt-2 border-t border-[var(--border)] truncate">
          {goal.notes}
        </p>
      )}
    </div>
  );
}
