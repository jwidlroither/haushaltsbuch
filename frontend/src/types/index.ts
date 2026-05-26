export interface User {
  userId: string;
  email: string;
  name: string;
}

export interface Category {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export type TransactionStatus = 'bezahlt' | 'ausstehend';

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
  status: TransactionStatus;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionFilters {
  month?: number;
  year?: number;
  category_id?: string;
  type?: 'income' | 'expense';
  status?: TransactionStatus;
  limit?: number;
  offset?: number;
}

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amount: number;
  description?: string;
  category_id?: string | null;
  date: string;
  status?: TransactionStatus;
}

export interface Summary {
  income: number;
  expense: number;
  paid: number;
  pending: number;
  balance: number;
  byCategory: CategorySummary[];
  monthlyTrend: MonthlyTrend[];
}

export interface CategorySummary {
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  status: TransactionStatus;
  total: number;
}

export interface MonthlyTrend {
  month: number;
  year: number;
  type: 'income' | 'expense';
  total: number;
}

export interface Budget {
  id: string;
  user_id: string;
  category_id: string | null;
  month: number;
  year: number;
  amount: number;
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

export interface BudgetOverview {
  month: number;
  year: number;
  totalBudget: number;
  totalIncome: number;
  paid: number;
  pending: number;
  available: number;
  budgetBase: number;
  usedPercent: number;
  paidPercent: number;
  pendingPercent: number;
  categoryBudgets: Budget[];
  byCategory: CategoryBudgetStat[];
  pendingTransactions: Transaction[];
}

export interface CategoryBudgetStat {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  status: TransactionStatus;
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
}

export interface CreateCategoryDto {
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
}

export type RecurringInterval = 'monthly' | 'weekly' | 'yearly' | 'quarterly';

export interface RecurringTransaction {
  id: string; user_id: string; category_id: string | null;
  type: 'income' | 'expense'; amount: number; description: string | null;
  interval: RecurringInterval; day_of_month: number | null;
  start_date: string; end_date: string | null; is_active: boolean;
  last_created: string | null;
  category_name?: string; category_icon?: string; category_color?: string;
  created_at: string;
}

export interface UpcomingPreviewItem {
  date: string; type: 'income' | 'expense'; amount: number;
  description: string | null; category_name: string | null;
  category_icon: string | null; category_color: string | null;
}

export interface CreateRecurringDto {
  type: 'income' | 'expense'; amount: number; description?: string;
  category_id?: string | null; interval: RecurringInterval;
  day_of_month?: number | null; start_date: string; end_date?: string | null;
}

export interface SavingsGoal {
  id: string; user_id: string; name: string; icon: string; color: string;
  target_amount: number; current_amount: number;
  deadline: string | null; is_completed: boolean; notes: string | null;
  progress_percent: number; days_remaining: number | null;
  created_at: string; updated_at: string;
}

export interface CreateGoalDto {
  name: string; icon: string; color: string;
  target_amount: number; current_amount?: number;
  deadline?: string | null; notes?: string | null;
}

export interface SparklinePoint {
  period: string;
  income: number;
  expense: number;
  balance: number;
}

export type SparklineRange = '7d' | 'month' | 'year' | 'all';
