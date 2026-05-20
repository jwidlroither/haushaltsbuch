import axios, { type AxiosError } from 'axios';
import type {
  Transaction, Category, Summary, Budget, BudgetOverview,
  TransactionFilters, CreateTransactionDto, CreateCategoryDto, ApiResponse
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// ── Request: attach JWT ───────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Response: handle 401 with toast before redirect ──────────
api.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      // Dispatch a custom event so the ToastContainer can show a message
      // before navigation (avoids importing toast here which would create
      // a circular dependency with the context)
      window.dispatchEvent(new CustomEvent('auth:expired'));
      // Small delay so the toast is visible before the redirect
      setTimeout(() => { window.location.href = '/login?error=session_expired'; }, 1500);
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  getLoginUrl: () => `${import.meta.env.VITE_API_URL || '/api'}/auth/login`,
  getMe:    () => api.get('/auth/me'),
  logout:   () => api.post<{ logoutUrl: string }>('/auth/logout'),
};

// ── Transactions ─────────────────────────────────────────────
export const transactionsApi = {
  list:      (filters: TransactionFilters = {}) =>
    api.get<ApiResponse<Transaction[]>>('/transactions', { params: filters }),
  create:    (data: CreateTransactionDto) =>
    api.post<ApiResponse<Transaction>>('/transactions', data),
  update:    (id: string, data: Partial<CreateTransactionDto>) =>
    api.put<ApiResponse<Transaction>>(`/transactions/${id}`, data),
  delete:    (id: string) => api.delete(`/transactions/${id}`),
  markPaid:  (id: string) => api.patch<ApiResponse<Transaction>>(`/transactions/${id}/pay`),
  getSummary:(params: { month?: number; year?: number }) =>
    api.get<Summary>('/transactions/summary', { params }),
};

// ── Categories ───────────────────────────────────────────────
export const categoriesApi = {
  list:   () => api.get<ApiResponse<Category[]>>('/categories'),
  create: (data: CreateCategoryDto) => api.post<ApiResponse<Category>>('/categories', data),
  update: (id: string, data: Partial<CreateCategoryDto>) =>
    api.put<ApiResponse<Category>>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

// ── Budgets ──────────────────────────────────────────────────
export const budgetApi = {
  list:     (month: number, year: number) =>
    api.get<ApiResponse<Budget[]>>('/budgets', { params: { month, year } }),
  upsert:   (data: { category_id?: string | null; month: number; year: number; amount: number }) =>
    api.post<ApiResponse<Budget>>('/budgets', data),
  delete:   (id: string) => api.delete(`/budgets/${id}`),
  overview: (month: number, year: number) =>
    api.get<BudgetOverview>('/budgets/overview', { params: { month, year } }),
};

export default api;
