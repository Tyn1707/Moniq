import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import type { AnalyticsPeriod, Currency } from '../utils/constants';
import {
  countDaysInclusive,
  previousRange,
  resolvePeriod,
  toDayKey,
  type DateRange,
} from '../utils/date';
import { ZERO, type Money, percentageOf, toNumber } from '../utils/money';
import type { PeriodTotals } from '../types/finance';
import { getTotals } from './balance.service';
import { getExpenseByCategory, type CategoryBreakdownItem } from './dashboard.service';
import { buildInsights, type Insight } from './insight.service';
import { listBudgets } from './budget.service';
import type { AnalyticsQuery } from '../validators/analytics.validator';

export interface DailyPoint {
  date: string;
  income: number;
  expense: number;
}

export type { PeriodTotals };

export interface AnalyticsResponse {
  currency: Currency;
  period: { key: AnalyticsPeriod; label: string; from: string; to: string; days: number };
  totals: PeriodTotals;
  previousTotals: PeriodTotals;
  comparison: {
    /** Percentage change vs the equivalent preceding period; null when there is no baseline. */
    incomeChange: number | null;
    expenseChange: number | null;
  };
  averageDailyExpense: number;
  highestExpenseCategory: CategoryBreakdownItem | null;
  highestSpendingDay: { date: string; amount: number } | null;
  expenseByCategory: CategoryBreakdownItem[];
  dailyTrend: DailyPoint[];
  transactionCount: number;
  insights: Insight[];
}

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  this_week: 'This Week',
  this_month: 'This Month',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  custom: 'Custom Range',
};

const toPeriodTotals = (totals: { income: Money; expense: Money }): PeriodTotals => {
  const net = totals.income.minus(totals.expense);
  return {
    income: toNumber(totals.income),
    expense: toNumber(totals.expense),
    netCashFlow: toNumber(net),
    savingsRate: percentageOf(net, totals.income),
  };
};

/** Percentage change from `before` to `after`; null when there is nothing to compare against. */
const changePercentage = (before: number, after: number): number | null => {
  if (before === 0) return null;
  return Math.round(((after - before) / before) * 10000) / 100;
};

/**
 * Per-day income/expense series for the period, with every day in range
 * present. Zero-filling matters here: the "highest spending day" and the chart
 * would both be misleading if quiet days simply vanished.
 */
const buildDailyTrend = async (userId: string, range: DateRange): Promise<DailyPoint[]> => {
  const rows = await prisma.transaction.findMany({
    where: { userId, transactionDate: { gte: range.from, lte: range.to } },
    select: { type: true, amount: true, transactionDate: true },
  });

  const buckets = new Map<string, { income: Money; expense: Money }>();
  const totalDays = countDaysInclusive(range.from, range.to);
  for (let index = 0; index < totalDays; index += 1) {
    const day = new Date(range.from.getTime() + index * 86_400_000);
    buckets.set(toDayKey(day), { income: ZERO, expense: ZERO });
  }

  for (const row of rows) {
    const key = toDayKey(row.transactionDate);
    const bucket = buckets.get(key) ?? { income: ZERO, expense: ZERO };
    if (row.type === 'INCOME') bucket.income = bucket.income.plus(row.amount);
    else bucket.expense = bucket.expense.plus(row.amount);
    buckets.set(key, bucket);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, bucket]) => ({
      date,
      income: toNumber(bucket.income),
      expense: toNumber(bucket.expense),
    }));
};

export const getAnalytics = async (
  userId: string,
  query: AnalyticsQuery,
  now = new Date(),
): Promise<AnalyticsResponse> => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
  if (!user) throw AppError.unauthorized();

  let range: DateRange;
  try {
    range = resolvePeriod(query.period, { from: query.from, to: query.to }, now);
  } catch (error) {
    throw AppError.badRequest(
      error instanceof Error ? error.message : 'Invalid analytics period.',
    );
  }
  const comparisonRange = previousRange(range);

  const [currentTotals, priorTotals, expenseByCategory, dailyTrend, transactionCount, budgets] =
    await Promise.all([
      getTotals(userId, range),
      getTotals(userId, comparisonRange),
      getExpenseByCategory(userId, range),
      buildDailyTrend(userId, range),
      prisma.transaction.count({
        where: { userId, transactionDate: { gte: range.from, lte: range.to } },
      }),
      listBudgets(userId, {}, now),
    ]);

  const days = countDaysInclusive(range.from, range.to);

  // Average per calendar day in the period, not per day that happened to have a
  // transaction — that is the figure a user can compare to a daily allowance.
  const averageDailyExpense = toNumber(currentTotals.expense.dividedBy(days));

  const highestSpendingDay = dailyTrend.reduce<{ date: string; amount: number } | null>(
    (highest, point) => {
      if (point.expense <= 0) return highest;
      if (!highest || point.expense > highest.amount) {
        return { date: point.date, amount: point.expense };
      }
      return highest;
    },
    null,
  );

  const totals = toPeriodTotals(currentTotals);
  const previousTotals = toPeriodTotals(priorTotals);

  return {
    currency: user.currency as Currency,
    period: {
      key: query.period,
      label: PERIOD_LABELS[query.period],
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      days,
    },
    totals,
    previousTotals,
    comparison: {
      incomeChange: changePercentage(previousTotals.income, totals.income),
      expenseChange: changePercentage(previousTotals.expense, totals.expense),
    },
    averageDailyExpense,
    highestExpenseCategory: expenseByCategory[0] ?? null,
    highestSpendingDay,
    expenseByCategory,
    dailyTrend,
    transactionCount,
    insights: buildInsights({
      periodLabel: PERIOD_LABELS[query.period],
      totals,
      previousTotals,
      expenseByCategory,
      averageDailyExpense,
      highestSpendingDay,
      budgets: budgets.items,
      transactionCount,
      currency: user.currency as Currency,
    }),
  };
};
