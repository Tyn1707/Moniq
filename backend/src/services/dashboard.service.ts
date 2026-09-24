import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import type { Currency } from '../utils/constants';
import {
  addUtcMonths,
  endOfUtcMonth,
  startOfUtcMonth,
  toMonthKey,
  type DateRange,
} from '../utils/date';
import { ZERO, type Money, money, percentageOf, toNumber } from '../utils/money';
import { getTotals } from './balance.service';
import { toTransactionDto } from './transaction.service';

const TREND_MONTHS = 6;
const RECENT_TRANSACTION_LIMIT = 8;

export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  /** Share of total expense in the period, 0–100. */
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

export interface DashboardResponse {
  currency: Currency;
  summary: {
    balance: number;
    totalIncome: number;
    totalExpense: number;
    savings: number;
    savingsRate: number | null;
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
  recentTransactions: ReturnType<typeof toTransactionDto>[];
  hasAnyTransactions: boolean;
}

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const monthLabel = (date: Date): string =>
  `${MONTH_LABELS[date.getUTCMonth()]} ${String(date.getUTCFullYear()).slice(2)}`;

/**
 * Expense split by category for a period, with each slice's share of the total.
 * Percentages are derived from the summed amounts rather than counted rows, so
 * one large purchase outweighs many small ones as it should.
 */
export const getExpenseByCategory = async (
  userId: string,
  range: DateRange,
): Promise<CategoryBreakdownItem[]> => {
  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'EXPENSE',
      transactionDate: { gte: range.from, lte: range.to },
    },
    _sum: { amount: true },
    _count: { _all: true },
  });

  if (grouped.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { userId, id: { in: grouped.map((row) => row.categoryId) } },
    select: { id: true, name: true },
  });
  const nameById = new Map(categories.map((category) => [category.id, category.name]));

  const total = grouped.reduce((acc, row) => acc.plus(row._sum.amount ?? ZERO), ZERO);

  return grouped
    .map((row) => {
      const amount = money(row._sum.amount ?? ZERO);
      return {
        categoryId: row.categoryId,
        categoryName: nameById.get(row.categoryId) ?? 'Uncategorised',
        amount: toNumber(amount),
        percentage: percentageOf(amount, total) ?? 0,
        transactionCount: row._count._all,
      };
    })
    .sort((a, b) => b.amount - a.amount);
};

/**
 * Income vs expense per month. Aggregated in application code because grouping
 * by a date *expression* is not expressible through Prisma's typed `groupBy`,
 * and the row count here is bounded by a handful of months of personal
 * transactions.
 */
export const getMonthlyTrend = async (
  userId: string,
  months = TREND_MONTHS,
  now = new Date(),
): Promise<MonthlyTrendPoint[]> => {
  const from = addUtcMonths(startOfUtcMonth(now), -(months - 1));
  const to = endOfUtcMonth(now);

  const rows = await prisma.transaction.findMany({
    where: { userId, transactionDate: { gte: from, lte: to } },
    select: { type: true, amount: true, transactionDate: true },
  });

  // Pre-seed every month in the window so gaps render as zero, not as missing
  // points that would distort the chart's shape.
  const buckets = new Map<string, { income: Money; expense: Money; label: string }>();
  for (let index = 0; index < months; index += 1) {
    const monthStart = addUtcMonths(from, index);
    buckets.set(toMonthKey(monthStart), {
      income: ZERO,
      expense: ZERO,
      label: monthLabel(monthStart),
    });
  }

  for (const row of rows) {
    const bucket = buckets.get(toMonthKey(row.transactionDate));
    if (!bucket) continue;
    if (row.type === 'INCOME') bucket.income = bucket.income.plus(row.amount);
    else bucket.expense = bucket.expense.plus(row.amount);
  }

  return [...buckets.entries()].map(([month, bucket]) => ({
    month,
    label: bucket.label,
    income: toNumber(bucket.income),
    expense: toNumber(bucket.expense),
    net: toNumber(bucket.income.minus(bucket.expense)),
  }));
};

/**
 * Everything the dashboard needs, in one round trip (brief §34). All figures
 * are computed here on the server so the client never has to do financial
 * arithmetic.
 */
export const getDashboard = async (userId: string, now = new Date()): Promise<DashboardResponse> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currency: true, initialBalance: true },
  });
  if (!user) throw AppError.unauthorized();

  const monthRange: DateRange = { from: startOfUtcMonth(now), to: endOfUtcMonth(now) };

  const [allTime, thisMonth, expenseByCategory, monthlyTrend, recentRows, transactionCount] =
    await Promise.all([
      getTotals(userId),
      getTotals(userId, monthRange),
      getExpenseByCategory(userId, monthRange),
      getMonthlyTrend(userId, TREND_MONTHS, now),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }],
        take: RECENT_TRANSACTION_LIMIT,
        include: { category: { select: { id: true, name: true } } },
      }),
      prisma.transaction.count({ where: { userId } }),
    ]);

  const savings = allTime.income.minus(allTime.expense);
  const balance = money(user.initialBalance).plus(savings);
  const monthNet = thisMonth.income.minus(thisMonth.expense);

  return {
    currency: user.currency as Currency,
    summary: {
      balance: toNumber(balance),
      totalIncome: toNumber(allTime.income),
      totalExpense: toNumber(allTime.expense),
      savings: toNumber(savings),
      savingsRate: percentageOf(savings, allTime.income),
    },
    currentMonth: {
      from: monthRange.from.toISOString(),
      to: monthRange.to.toISOString(),
      income: toNumber(thisMonth.income),
      expense: toNumber(thisMonth.expense),
      net: toNumber(monthNet),
      savingsRate: percentageOf(monthNet, thisMonth.income),
    },
    expenseByCategory,
    monthlyTrend,
    recentTransactions: recentRows.map(toTransactionDto),
    hasAnyTransactions: transactionCount > 0,
  };
};
