import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  analyticsService,
  budgetService,
  categoryService,
  dashboardService,
  portfolioService,
  transactionService,
} from '../services';
import type {
  AnalyticsPeriod,
  BudgetPayload,
  ChartRange,
  HoldingPayload,
  TransactionFilters,
  TransactionPayload,
  TransactionType,
  UpdateHoldingPayload,
} from '../types';

/**
 * Data-access hooks.
 *
 * Every mutation invalidates the *derived* caches (dashboard, budgets,
 * analytics) as well as the list it changed. Balances, budget usage and insights
 * are all recomputed server-side, so after a write the only correct thing to do
 * is re-fetch them rather than patch numbers locally.
 */

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  transactions: (filters: TransactionFilters) => ['transactions', filters] as const,
  categories: (type: 'ALL' | TransactionType) => ['categories', type] as const,
  budgets: (month?: string) => ['budgets', month ?? 'current'] as const,
  analytics: (period: AnalyticsPeriod, from?: string, to?: string) =>
    ['analytics', period, from ?? null, to ?? null] as const,
  portfolio: ['portfolio'] as const,
  balanceHistory: (range: ChartRange) => ['balance-history', range] as const,
  priceHistory: (symbol: string, range: ChartRange) =>
    ['price-history', symbol, range] as const,
};

/** Caches that depend on transaction data and must be refreshed after a write. */
const DERIVED_KEYS = [['dashboard'], ['budgets'], ['analytics']] as const;

const useInvalidateFinancialData = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['transactions'] }),
      ...DERIVED_KEYS.map((key) => queryClient.invalidateQueries({ queryKey: key })),
    ]);
  };
};

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const useDashboard = () =>
  useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: async () => (await dashboardService.get()).data,
  });

export const useTransactions = (filters: TransactionFilters) =>
  useQuery({
    queryKey: queryKeys.transactions(filters),
    queryFn: () => transactionService.list(filters),
    // Keeps the table visible (not blank) while a new page or filter loads.
    placeholderData: (previous) => previous,
  });

export const useCategories = (type: 'ALL' | TransactionType = 'ALL') =>
  useQuery({
    queryKey: queryKeys.categories(type),
    queryFn: async () => (await categoryService.list(type)).data,
    staleTime: 5 * 60_000,
  });

export const useBudgets = (month?: string) =>
  useQuery({
    queryKey: queryKeys.budgets(month),
    queryFn: () => budgetService.list(month),
  });

export const useAnalytics = (period: AnalyticsPeriod, from?: string, to?: string) =>
  useQuery({
    queryKey: queryKeys.analytics(period, from, to),
    queryFn: async () => (await analyticsService.get({ period, from, to })).data,
    // A custom range is incomplete until both ends are chosen.
    enabled: period !== 'custom' || (Boolean(from) && Boolean(to)),
  });

// ---------------------------------------------------------------------------
// Transaction mutations
// ---------------------------------------------------------------------------

export const useCreateTransaction = () => {
  const invalidate = useInvalidateFinancialData();
  return useMutation({
    mutationFn: (payload: TransactionPayload) => transactionService.create(payload),
    onSuccess: invalidate,
  });
};

export const useUpdateTransaction = () => {
  const invalidate = useInvalidateFinancialData();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<TransactionPayload> }) =>
      transactionService.update(id, payload),
    onSuccess: invalidate,
  });
};

export const useDeleteTransaction = () => {
  const invalidate = useInvalidateFinancialData();
  return useMutation({
    mutationFn: (id: string) => transactionService.remove(id),
    onSuccess: invalidate,
  });
};

// ---------------------------------------------------------------------------
// Budget mutations
// ---------------------------------------------------------------------------

export const useCreateBudget = () => {
  const invalidate = useInvalidateFinancialData();
  return useMutation({
    mutationFn: (payload: BudgetPayload) => budgetService.create(payload),
    onSuccess: invalidate,
  });
};

export const useUpdateBudget = () => {
  const invalidate = useInvalidateFinancialData();
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      budgetService.update(id, { amount }),
    onSuccess: invalidate,
  });
};

export const useDeleteBudget = () => {
  const invalidate = useInvalidateFinancialData();
  return useMutation({
    mutationFn: (id: string) => budgetService.remove(id),
    onSuccess: invalidate,
  });
};

// ---------------------------------------------------------------------------
// Category mutations
// ---------------------------------------------------------------------------

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; type: TransactionType }) => categoryService.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryService.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories'] }),
  });
};


// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

/** Keep live prices moving without hammering the vendor; backend caches for 60s. */
const PORTFOLIO_REFETCH_INTERVAL = 60_000;

export const usePortfolio = () =>
  useQuery({
    queryKey: queryKeys.portfolio,
    queryFn: () => portfolioService.list(),
    // Prices drift during market hours; a gentle poll keeps the view current.
    refetchInterval: PORTFOLIO_REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  });

/** Net worth on the dashboard includes investments, so refresh it too. */
const useInvalidatePortfolio = () => {
  const queryClient = useQueryClient();
  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  };
};

export const useCreateHolding = () => {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (payload: HoldingPayload) => portfolioService.create(payload),
    onSuccess: invalidate,
  });
};

export const useUpdateHolding = () => {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateHoldingPayload }) =>
      portfolioService.update(id, payload),
    onSuccess: invalidate,
  });
};

export const useDeleteHolding = () => {
  const invalidate = useInvalidatePortfolio();
  return useMutation({
    mutationFn: (id: string) => portfolioService.remove(id),
    onSuccess: invalidate,
  });
};

// ---------------------------------------------------------------------------
// Interactive history charts
// ---------------------------------------------------------------------------

export const useBalanceHistory = (range: ChartRange) =>
  useQuery({
    queryKey: queryKeys.balanceHistory(range),
    queryFn: async () => (await dashboardService.balanceHistory(range)).data,
    // Derived from transactions, which change rarely between views.
    staleTime: 60_000,
  });

export const usePriceHistory = (symbol: string, range: ChartRange) =>
  useQuery({
    queryKey: queryKeys.priceHistory(symbol, range),
    queryFn: async () => (await portfolioService.history(symbol, range)).data,
    enabled: Boolean(symbol),
    staleTime: 60_000,
  });
