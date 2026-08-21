import type { BudgetOverview } from '../../types';
import { formatCurrency } from '../../utils/format';

interface Props {
  overview: BudgetOverview;
  isCurrentMonth: boolean;
}

interface Alert {
  type: 'danger' | 'warning' | 'success';
  message: string;
  detail?: string;
}

export default function BudgetAlerts({ overview, isCurrentMonth }: Props) {
  if (!isCurrentMonth || overview.budgetBase <= 0) return null;

  const { available, budgetBase, paid, byCategory, categoryBudgets } = overview;

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const avgPerDay = dayOfMonth > 0 ? paid / dayOfMonth : 0;
  const daysAtThisRate = avgPerDay > 0 ? available / avgPerDay : 999;
  const pctUsed = budgetBase > 0 ? (paid / budgetBase) * 100 : 0;

  const alerts: Alert[] = [];

  if (available < 0) {
    alerts.push({
      type: 'danger',
      message: `Gesamtbudget überschritten!`,
      detail: `Du hast ${formatCurrency(Math.abs(available))} mehr ausgegeben als verfügbar.`,
    });
  } else if (pctUsed >= 90) {
    alerts.push({
      type: 'danger',
      message: `Nur noch ${formatCurrency(available)} übrig`,
      detail: `Du hast ${pctUsed.toFixed(0)}% deines Monatsbudgets verbraucht.`,
    });
  } else if (pctUsed >= 80) {
    alerts.push({
      type: 'warning',
      message: `80% des Budgets verbraucht`,
      detail: `Noch ${formatCurrency(available)} für ${daysLeft} verbleibende Tage.`,
    });
  } else if (avgPerDay > 0 && daysAtThisRate < daysLeft && daysAtThisRate < 10) {
    alerts.push({
      type: 'warning',
      message: `Ausgabentempo zu hoch`,
      detail: `Bei ${formatCurrency(avgPerDay)}/Tag ist das Budget in ~${Math.round(daysAtThisRate)} Tagen aufgebraucht – es bleiben noch ${daysLeft} Tage.`,
    });
  }

  // Kategorie-Warnungen
  categoryBudgets.forEach(budget => {
    if (!budget.category_id) return;
    const catStat = byCategory.filter(b => b.category_id === budget.category_id);
    const spent = catStat.reduce((s, c) => s + c.total, 0);
    const pct = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;

    if (pct >= 100) {
      alerts.push({
        type: 'danger',
        message: `${budget.category_icon ?? ''} ${budget.category_name}: Budget überzogen`,
        detail: `${formatCurrency(spent)} von ${formatCurrency(budget.amount)} verbraucht.`,
      });
    } else if (pct >= 80) {
      alerts.push({
        type: 'warning',
        message: `${budget.category_icon ?? ''} ${budget.category_name}: Fast aufgebraucht (${pct.toFixed(0)}%)`,
        detail: `Noch ${formatCurrency(budget.amount - spent)} verfügbar.`,
      });
    }
  });

  if (alerts.length === 0 && pctUsed < 50 && dayOfMonth > 15) {
    alerts.push({
      type: 'success',
      message: 'Super! Monatsmitte gut gemeistert',
      detail: `Du hast noch ${formatCurrency(available)} übrig – weiter so!`,
    });
  }

  if (alerts.length === 0) return null;

  const styles = {
    danger: {
      wrapper: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
      icon: '⚠',
      title: 'text-red-800 dark:text-red-200',
      detail: 'text-red-700 dark:text-red-300',
    },
    warning: {
      wrapper: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
      icon: '!',
      title: 'text-amber-800 dark:text-amber-200',
      detail: 'text-amber-700 dark:text-amber-300',
    },
    success: {
      wrapper: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
      icon: '✓',
      title: 'text-emerald-800 dark:text-emerald-200',
      detail: 'text-emerald-700 dark:text-emerald-300',
    },
  };

  return (
    <div className="space-y-2 animate-on-mount">
      {alerts.map((alert, i) => {
        const s = styles[alert.type];
        return (
          <div key={i} className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${s.wrapper}`}>
            <span className={`text-sm font-bold mt-0.5 ${s.title}`}>{s.icon}</span>
            <div>
              <p className={`text-sm font-medium ${s.title}`}>{alert.message}</p>
              {alert.detail && <p className={`text-xs mt-0.5 ${s.detail}`}>{alert.detail}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
