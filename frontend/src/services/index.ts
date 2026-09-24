import { apiRequest, type Envelope } from './api';
import type {
  AnalyticsData,
  AnalyticsPeriod,
  Budget,
  BudgetListData,
  BudgetPayload,
  Category,
  Currency,
  DashboardData,
  Pagination,
  Transaction,
  TransactionFilters,
  TransactionPayload,
  TransactionType,
  User,
} from '../types';

// ---------------------------------------------------------------------------
// Auth & profile
// ---------------------------------------------------------------------------

export const authService = {
  register: (payload: { name: string; email: string; password: string; confirmPassword: string }) =>
    apiRequest<Envelope<{ user: User }>>('/auth/register', { method: 'POST', body: payload }),

  login: (payload: { email: string; password: string }) =>
    apiRequest<Envelope<{ user: User }>>('/auth/login', { method: 'POST', body: payload }),

  logout: () => apiRequest<Envelope<{ message: string }>>('/auth/logout', { method: 'POST' }),

  me: () => apiRequest<Envelope<{ user: User }>>('/auth/me'),

  completeOnboarding: (payload: {
    initialBalance: number;
    currency: Currency;
    monthlyIncomeTarget: number;
    preferredCategories: string[];
  }) => apiRequest<Envelope<{ user: User }>>('/auth/onboarding', { method: 'POST', body: payload }),

  skipOnboarding: () =>
    apiRequest<Envelope<{ user: User }>>('/auth/onboarding/skip', { method: 'POST' }),

  updateProfile: (payload: { name?: string; currency?: Currency; initialBalance?: number }) =>
    apiRequest<Envelope<{ user: User }>>('/profile', { method: 'PUT', body: payload }),

  changePassword: (payload: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => apiRequest<Envelope<{ message: string }>>('/profile/password', { method: 'PUT', body: payload }),
};

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

interface TransactionListResponse {
  data: Transaction[];
  pagination: Pagination;
}

export const transactionService = {
  list: (filters: TransactionFilters) =>
    apiRequest<TransactionListResponse>('/transactions', {
      query: {
        search: filters.search,
        type: filters.type,
        categoryId: filters.categoryId,
        datePreset: filters.datePreset,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sort: filters.sort,
        page: filters.page,
        pageSize: filters.pageSize,
      },
    }),

  get: (id: string) => apiRequest<Envelope<Transaction>>(`/transactions/${id}`),

  create: (payload: TransactionPayload) =>
    apiRequest<Envelope<Transaction>>('/transactions', { method: 'POST', body: payload }),

  update: (id: string, payload: Partial<TransactionPayload>) =>
    apiRequest<Envelope<Transaction>>(`/transactions/${id}`, { method: 'PUT', body: payload }),

  remove: (id: string) =>
    apiRequest<Envelope<{ id: string }>>(`/transactions/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categoryService = {
  list: (type: 'ALL' | TransactionType = 'ALL') =>
    apiRequest<Envelope<Category[]>>('/categories', { query: { type } }),

  create: (payload: { name: string; type: TransactionType }) =>
    apiRequest<Envelope<Category>>('/categories', { method: 'POST', body: payload }),

  rename: (id: string, name: string) =>
    apiRequest<Envelope<Category>>(`/categories/${id}`, { method: 'PUT', body: { name } }),

  remove: (id: string) =>
    apiRequest<Envelope<{ id: string }>>(`/categories/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Dashboard, budgets, analytics
// ---------------------------------------------------------------------------

export const dashboardService = {
  get: () => apiRequest<Envelope<DashboardData>>('/dashboard'),
};

export const budgetService = {
  list: async (month?: string): Promise<BudgetListData> => {
    const response = await apiRequest<{
      data: Budget[];
      period: BudgetListData['period'];
      totals: BudgetListData['totals'];
    }>('/budgets', { query: { month } });
    return { items: response.data, period: response.period, totals: response.totals };
  },

  create: (payload: BudgetPayload) =>
    apiRequest<Envelope<Budget>>('/budgets', { method: 'POST', body: payload }),

  update: (id: string, payload: Partial<Omit<BudgetPayload, 'categoryId'>>) =>
    apiRequest<Envelope<Budget>>(`/budgets/${id}`, { method: 'PUT', body: payload }),

  remove: (id: string) => apiRequest<Envelope<{ id: string }>>(`/budgets/${id}`, { method: 'DELETE' }),
};

export const analyticsService = {
  get: (params: { period: AnalyticsPeriod; from?: string; to?: string }) =>
    apiRequest<Envelope<AnalyticsData>>('/analytics', {
      query: { period: params.period, from: params.from, to: params.to },
    }),
};
