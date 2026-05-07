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

export interface Transaction {
  id: string;
  user_id: string;
  category_id: string | null;
  type: 'income' | 'expense';
  amount: number;
  description: string | null;
  date: string;
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
  limit?: number;
  offset?: number;
}

export interface Summary {
  income: number;
  expense: number;
  balance: number;
  byCategory: CategorySummary[];
  monthlyTrend: MonthlyTrend[];
}

export interface CategorySummary {
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense';
  total: number;
}

export interface MonthlyTrend {
  month: number;
  year: number;
  type: 'income' | 'expense';
  total: number;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amount: number;
  description?: string;
  category_id?: string | null;
  date: string;
}

export interface CreateCategoryDto {
  name: string;
  icon: string;
  color: string;
  type: 'income' | 'expense' | 'both';
}
