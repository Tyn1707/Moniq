/**
 * Domain constants.
 *
 * These are the single source of truth for the "enum-like" string columns in
 * the Prisma schema (see the portability note in prisma/schema.prisma).
 */

export const TRANSACTION_TYPES = ['INCOME', 'EXPENSE'] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const PAYMENT_METHODS = [
  'CASH',
  'DEBIT_CARD',
  'CREDIT_CARD',
  'BANK_TRANSFER',
  'E_WALLET',
  'OTHER',
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SUPPORTED_CURRENCIES = ['IDR', 'USD', 'EUR', 'SGD', 'MYR', 'JPY', 'AUD', 'GBP'] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = 'IDR';

/**
 * Budget usage threshold, in percent of the budgeted amount, at which a budget
 * is reported as WARNING rather than SAFE. 75 comes straight from the worked
 * example in brief §17: 750,000 of a 1,000,000 budget is a WARNING.
 */
export const BUDGET_WARNING_THRESHOLD = 75;

export const BUDGET_STATUSES = ['SAFE', 'WARNING', 'EXCEEDED'] as const;
export type BudgetStatus = (typeof BUDGET_STATUSES)[number];

/** Category set created for every new user (brief §10). */
export const DEFAULT_INCOME_CATEGORIES = [
  'Salary',
  'Allowance',
  'Freelance',
  'Business',
  'Investment',
  'Gift',
  'Other Income',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Food',
  'Transportation',
  'Bills',
  'Shopping',
  'Entertainment',
  'Education',
  'Health',
  'Subscription',
  'Rent',
  'Other Expense',
] as const;

export const ANALYTICS_PERIODS = [
  'this_week',
  'this_month',
  'last_month',
  'last_3_months',
  'custom',
] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export const AUTH_COOKIE_NAME = 'financetrack_token';

/** Maximum amount accepted for a single transaction or budget. */
export const MAX_AMOUNT = 1_000_000_000_000;
