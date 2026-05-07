import axios from 'axios';
import type {
  Transaction, Category, Summary,
  TransactionFilters, CreateTransactionDto, CreateCategoryDto,
  ApiResponse
} from '../types';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  getLoginUrl: () => `${import.meta.env.VITE_API_URL || '/api'}/auth/login`,
  getMe: () => api.get('/auth/me'),
  logout: () => api.post<{ logoutUrl: string }>('/auth/logout'),
};

export const transactionsApi = {
  list: (filters: TransactionFilters = {}) =>
    api.get<ApiResponse<Transaction[]>>('/transactions', { params: filters }),

  create: (data: CreateTransactionDto) =>
    api.post<ApiResponse<Transaction>>('/transactions', data),

  update: (id: string, data: Partial<CreateTransactionDto>) =>
    api.put<ApiResponse<Transaction>>(`/transactions/${id}`, data),

  delete: (id: string) => api.delete(`/transactions/${id}`),

  getSummary: (params: { month?: number; year?: number }) =>
    api.get<Summary>('/transactions/summary', { params }),
};

export const categoriesApi = {
  list: () => api.get<ApiResponse<Category[]>>('/categories'),
  create: (data: CreateCategoryDto) => api.post<ApiResponse<Category>>('/categories', data),
  update: (id: string, data: Partial<CreateCategoryDto>) =>
    api.put<ApiResponse<Category>>(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export default api;
