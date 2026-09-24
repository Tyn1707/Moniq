import type { Currency } from '../utils/constants';
import type { PeriodTotals } from '../types/finance';
import type { CategoryBreakdownItem } from './dashboard.service';
import type { BudgetDto } from './budget.service';

/**
 * Financial insights (brief §19).
 *
 * Every rule below is a pure function of aggregates that were computed from the
 * user's own transaction rows. Nothing is invented, guessed, or templated from
 * sample data: if the underlying figure is missing, the insight is simply not
 * emitted. That is why each rule guards on its inputs before pushing.
 */

export type InsightTone = 'positive' | 'neutral' | 'warning' | 'critical';

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  message: string;
}

export interface InsightContext {
  periodLabel: string;
  totals: PeriodTotals;
  previousTotals: PeriodTotals;
  expenseByCategory: CategoryBreakdownItem[];
  averageDailyExpense: number;
  highestSpendingDay: { date: string; amount: number } | null;
  budgets: BudgetDto[];
  transactionCount: number;
  currency: Currency;
}

const CURRENCY_LOCALES: Record<Currency, string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  SGD: 'en-SG',
  MYR: 'ms-MY',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  GBP: 'en-GB',
};

const formatMoney = (amount: number, currency: Currency): string =>
  new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const formatPercent = (value: number): string => `${Math.abs(Math.round(value))}%`;

/**
 * Explicit month abbreviations: `Intl` short-month output varies between ICU
 * versions ("Sep" vs "Sept"), and insight text should read identically wherever
 * the server runs.
 */
const MONTHS_SHORT = [
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
] as const;

const formatDate = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
};

export const buildInsights = (context: InsightContext): Insight[] => {
  const insights: Insight[] = [];
  const period = context.periodLabel.toLowerCase();

  // Nothing to analyse yet — say so rather than emitting hollow statistics.
  if (context.transactionCount === 0) {
    return [
      {
        id: 'no-data',
        tone: 'neutral',
        title: 'No data for this period',
        message: `You have no transactions recorded for ${period}. Add a transaction to start seeing insights.`,
      },
    ];
  }

  // 1. Largest expense category.
  const largest = context.expenseByCategory[0];
  if (largest && largest.amount > 0) {
    insights.push({
      id: 'largest-category',
      tone: 'neutral',
      title: 'Biggest spending category',
      message: `${largest.categoryName} is your largest expense category ${period}, at ${formatMoney(largest.amount, context.currency)} (${formatPercent(largest.percentage)} of spending).`,
    });
  }

  // 2. Spending trend vs the equivalent preceding period.
  if (context.previousTotals.expense > 0 && context.totals.expense > 0) {
    const change =
      ((context.totals.expense - context.previousTotals.expense) / context.previousTotals.expense) * 100;
    if (Math.abs(change) >= 5) {
      insights.push(
        change > 0
          ? {
              id: 'spending-up',
              tone: 'warning',
              title: 'Spending increased',
              message: `Your spending increased by ${formatPercent(change)} compared with the previous period.`,
            }
          : {
              id: 'spending-down',
              tone: 'positive',
              title: 'Spending decreased',
              message: `Your spending dropped by ${formatPercent(change)} compared with the previous period. Keep it up.`,
            },
      );
    }
  }

  // 3. Savings rate / cash-flow health.
  if (context.totals.income > 0 && context.totals.savingsRate !== null) {
    const rate = context.totals.savingsRate;
    if (rate > 0) {
      insights.push({
        id: 'savings-rate',
        tone: rate >= 20 ? 'positive' : 'neutral',
        title: 'Savings rate',
        message: `You saved ${formatPercent(rate)} of your income ${period} (${formatMoney(context.totals.netCashFlow, context.currency)}).`,
      });
    } else {
      insights.push({
        id: 'negative-cash-flow',
        tone: 'critical',
        title: 'Spending exceeds income',
        message: `You spent ${formatMoney(Math.abs(context.totals.netCashFlow), context.currency)} more than you earned ${period}.`,
      });
    }
  } else if (context.totals.expense > 0 && context.totals.income === 0) {
    insights.push({
      id: 'no-income',
      tone: 'warning',
      title: 'No income recorded',
      message: `You recorded ${formatMoney(context.totals.expense, context.currency)} of expenses but no income ${period}.`,
    });
  }

  // 4. Budgets that are exceeded, then those approaching their limit.
  const exceeded = context.budgets.filter((budget) => budget.status === 'EXCEEDED');
  for (const budget of exceeded.slice(0, 2)) {
    insights.push({
      id: `budget-exceeded-${budget.id}`,
      tone: 'critical',
      title: `${budget.category.name} budget exceeded`,
      message: `You have exceeded your ${budget.category.name} budget by ${formatMoney(Math.abs(budget.remaining), context.currency)} (${formatPercent(budget.usagePercentage)} used).`,
    });
  }

  const nearLimit = context.budgets.filter((budget) => budget.status === 'WARNING');
  for (const budget of nearLimit.slice(0, 2)) {
    insights.push({
      id: `budget-warning-${budget.id}`,
      tone: 'warning',
      title: `${budget.category.name} budget almost used`,
      message: `You have used ${formatPercent(budget.usagePercentage)} of your ${budget.category.name} budget, with ${formatMoney(budget.remaining, context.currency)} left.`,
    });
  }

  // 5. Daily burn rate.
  if (context.averageDailyExpense > 0) {
    insights.push({
      id: 'average-daily-expense',
      tone: 'neutral',
      title: 'Average daily spend',
      message: `You spend an average of ${formatMoney(context.averageDailyExpense, context.currency)} per day ${period}.`,
    });
  }

  // 6. Single heaviest day, only when it is genuinely an outlier.
  if (
    context.highestSpendingDay &&
    context.averageDailyExpense > 0 &&
    context.highestSpendingDay.amount >= context.averageDailyExpense * 2
  ) {
    insights.push({
      id: 'highest-spending-day',
      tone: 'neutral',
      title: 'Heaviest spending day',
      message: `${formatDate(context.highestSpendingDay.date)} was your heaviest spending day, at ${formatMoney(context.highestSpendingDay.amount, context.currency)}.`,
    });
  }

  return insights;
};
