/**
 * API contract types.
 *
 * These mirror the DTOs returned by the backend. Keeping them in one place means
 * a change to a server response surfaces as a compile error in every component
 * that reads it, rather than as `undefined` at runtime.
 */

export type TransactionType = 'INCOME' | 'EXPENSE';

export type PaymentMethod =
  | 'CASH'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'E_WALLET'
  | 'OTHER';

export type BudgetStatus = 'SAFE' | 'WARNING' | 'EXCEEDED';

export type Currency = 'IDR' | 'USD' | 'EUR' | 'SGD' | 'MYR' | 'JPY' | 'AUD' | 'GBP';

export type AnalyticsPeriod = 'this_week' | 'this_month' | 'last_month' | 'last_3_months' | 'custom';

export interface User {
  id: string;
  name: string;
  email: string;
  currency: Currency;
  initialBalance: number;
  monthlyIncomeTarget: number;
  onboardingCompleted: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  isDefault: boolean;
  transactionCount: number;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  category: { id: string; name: string };
  createdAt: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  income: number;
  expense: number;
  net: number;
}

export interface DashboardData {
  currency: Currency;
  summary: {
    balance: number;
    totalIncome: number;
    totalExpense: number;
    savings: number;
    savingsRate: number | null;
  };
  netWorth: {
    total: number;
    cash: number;
    investments: number;
    hasInvestments: boolean;
  };
  currentMonth: {
    from: string;
    to: string;
    income: number;
    expense: number;
    net: number;
    savingsRate: number | null;
  };
  expenseByCategory: CategoryBreakdownItem[];
  monthlyTrend: MonthlyTrendPoint[];
  recentTransactions: Transaction[];
  hasAnyTransactions: boolean;
}

export interface Budget {
  id: string;
  category: { id: string; name: string };
  amount: number;
  spent: number;
  remaining: number;
  usagePercentage: number;
  status: BudgetStatus;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
}

export interface BudgetListData {
  items: Budget[];
  period: { month: string; from: string; to: string };
  totals: { budgeted: number; spent: number; remaining: number; usagePercentage: number };
}

export type InsightTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  message: string;
}

export interface PeriodTotals {
  income: number;
  expense: number;
  netCashFlow: number;
  savingsRate: number | null;
}

export interface DailyPoint {
  date: string;
  income: number;
  expense: number;
}

export interface AnalyticsData {
  currency: Currency;
  period: { key: AnalyticsPeriod; label: string; from: string; to: string; days: number };
  totals: PeriodTotals;
  previousTotals: PeriodTotals;
  comparison: { incomeChange: number | null; expenseChange: number | null };
  averageDailyExpense: number;
  highestExpenseCategory: CategoryBreakdownItem | null;
  highestSpendingDay: { date: string; amount: number } | null;
  expenseByCategory: CategoryBreakdownItem[];
  dailyTrend: DailyPoint[];
  transactionCount: number;
  insights: Insight[];
}

// ---------------------------------------------------------------------------
// Request payloads
// ---------------------------------------------------------------------------

export interface TransactionFilters {
  search?: string;
  type?: 'ALL' | TransactionType;
  categoryId?: string;
  datePreset?: 'all' | 'today' | 'this_week' | 'this_month' | 'custom';
  dateFrom?: string;
  dateTo?: string;
  sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
  page?: number;
  pageSize?: number;
}

export interface TransactionPayload {
  type: TransactionType;
  amount: number;
  categoryId: string;
  description: string;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}

export interface BudgetPayload {
  categoryId: string;
  amount: number;
  periodStart?: string;
  periodEnd?: string;
}

// ---------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgBuyPrice: number;
  currency: Currency;
  costBasis: number;
  currentPrice: number | null;
  marketValue: number | null;
  profitLoss: number | null;
  profitLossPercentage: number | null;
  dayChange: number | null;
  dayChangePercentage: number | null;
  allocation: number;
  priceStale: boolean;
  priceAsOf: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PortfolioTotals {
  costBasis: number;
  marketValue: number;
  profitLoss: number;
  profitLossPercentage: number | null;
  dayChange: number;
  dayChangePercentage: number | null;
}

export interface PortfolioData {
  holdings: Holding[];
  totals: PortfolioTotals;
  currency: Currency;
  pricesAsOf: string | null;
  pricesStale: boolean;
  holdingCount: number;
}

export interface SymbolSearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  type: string | null;
}

export interface Quote {
  symbol: string;
  price: number;
  currency: string;
  previousClose: number | null;
  shortName: string | null;
  asOf: string;
  stale: boolean;
}

export interface HoldingPayload {
  symbol: string;
  name?: string;
  shares: number;
  avgBuyPrice: number;
  currency?: Currency;
}

export interface UpdateHoldingPayload {
  name?: string;
  shares?: number;
  avgBuyPrice?: number;
  currency?: Currency;
}

// ---------------------------------------------------------------------------
// Interactive history charts
// ---------------------------------------------------------------------------

export type ChartRange = '1W' | '1M' | '3M' | '1Y' | 'ALL';

export interface BalancePoint {
  date: string;
  balance: number;
}

export interface BalanceHistoryData {
  range: ChartRange;
  from: string;
  to: string;
  points: BalancePoint[];
}

export interface PricePoint {
  date: string;
  close: number;
}

export interface PriceHistoryData {
  symbol: string;
  currency: Currency;
  shortName: string | null;
  range: ChartRange;
  points: PricePoint[];
}
