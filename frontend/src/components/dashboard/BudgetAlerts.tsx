import type { BudgetOverview } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getPayday } from '../ui/BudgetModal';

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

  const { available, budgetBase, paid, pending, byCategory, categoryBudgets } = overview;
  const totalSpent = paid + pending;

  const now = new Date();
  const today = now.getDate();
  const payday = getPayday();
  const daysUntilPayday = today < payday ? payday - today : 0;
  const afterPayday = today >= payday;

  const avgPerDay = today > 0 ? totalSpent / today : 0;
  const daysAtThisRate = avgPerDay > 0 ? available / avgPerDay : 999;
  const pctUsed = budgetBase > 0 ? (totalSpent / budgetBase) * 100 : 0;

  const alerts: Alert[] = [];

  if (available < 0) {
    alerts.push({
      type: 'danger',
      message: 'Gesamtbudget überschritten!',
      detail: `Du hast ${formatCurrency(Math.abs(available))} mehr ausgegeben als verfügbar.`,
    });
  } else if (!afterPayday && avgPerDay > 0 && daysAtThisRate < daysUntilPayday) {
    alerts.push({
      type: 'danger',
      message: `Geld reicht nicht bis zum Zahltag (${payday}.)!`,
      detail: `Bei aktuellem Tempo (${formatCurrency(avgPerDay)}/Tag) ist das Geld in ~${Math.round(daysAtThisRate)} Tagen weg – noch ${daysUntilPayday} Tage bis zum Gehalt.`,
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
      message: '80% des Budgets verbraucht',
      detail: afterPayday
        ? `Noch ${formatCurrency(available)} für den Rest des Monats.`
        : `Noch ${formatCurrency(available)} bis zum Zahltag am ${payday}.`,
    });
  }

  // Kategorie-Warnungen
  categoryBudgets.forEach(budget => {
    if (!budget.category_id) return;
    const spent = byCategory
      .filter(b => b.category_id === budget.category_id)
      .reduce((s, c) => s + Number(c.total), 0);
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

  if (alerts.length === 0 && afterPayday && pctUsed < 50) {
    alerts.push({
      type: 'success',
      message: 'Gut unterwegs! 👍',
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
