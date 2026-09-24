import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarRange,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { Card } from '../components/ui';
import { AnalyticsSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { DailyTrendChart, ExpenseCategoryChart } from '../components/charts/Charts';
import { InsightList } from '../components/dashboard/InsightList';
import { useAnalytics } from '../hooks/useFinanceData';
import { formatCurrency, formatPercentage, formatShortDate, toDateInputValue } from '../utils/format';
import type { AnalyticsPeriod } from '../types';

/**
 * Analytics (brief §18, §19).
 *
 * The period selector is the only real control; everything else is a projection
 * of the server's response for that period. Comparisons against the previous
 * equivalent period are also computed server-side, so "up 20%" always means the
 * same thing here as it does in an insight.
 */

const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: 'Last 3 months' },
  { value: 'custom', label: 'Custom range' },
];

const StatCard = ({
  label,
  value,
  caption,
  icon,
  accent = 'neutral',
}: {
  label: string;
  value: string;
  caption?: string;
  icon: React.ReactNode;
  accent?: 'neutral' | 'income' | 'expense';
}) => (
  <div className="card p-5">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <span
        className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          accent === 'income'
            ? 'bg-income-light text-income-dark'
            : accent === 'expense'
              ? 'bg-expense-light text-expense-dark'
              : 'bg-slate-100 text-slate-600',
        )}
      >
        {icon}
      </span>
    </div>
    <p
      className={clsx(
        'mt-3 break-words text-xl font-semibold tabular sm:text-2xl',
        accent === 'income'
          ? 'text-income-dark'
          : accent === 'expense'
            ? 'text-expense-dark'
            : 'text-slate-900',
      )}
    >
      {value}
    </p>
    {caption && <p className="mt-1.5 text-xs text-slate-500">{caption}</p>}
  </div>
);

const ChangeLabel = ({ change, invert = false }: { change: number | null; invert?: boolean }) => {
  if (change === null) return <>No comparable data for the previous period</>;
  if (change === 0) return <>Unchanged from the previous period</>;

  const isUp = change > 0;
  // For expenses, "up" is bad — so the good/bad colour flips.
  const isGood = invert ? !isUp : isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1',
        isGood ? 'text-income-dark' : 'text-expense-dark',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {formatPercentage(Math.abs(change))} vs previous period
    </span>
  );
};

export const AnalyticsPage = () => {
  const [period, setPeriod] = useState<AnalyticsPeriod>('this_month');
  const [customFrom, setCustomFrom] = useState(toDateInputValue());
  const [customTo, setCustomTo] = useState(toDateInputValue());

  const { data, isLoading, isError, error, refetch } = useAnalytics(
    period,
    period === 'custom' ? customFrom : undefined,
    period === 'custom' ? customTo : undefined,
  );

  const currency = data?.currency ?? 'IDR';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Analytics</h1>
        <p className="text-sm text-slate-500">
          Understand your spending patterns over a period you choose.
        </p>
      </header>

      <Card>
        <div className="space-y-3">
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Select analytics period"
          >
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                aria-pressed={period === option.value}
                className={clsx(
                  'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
                  period === option.value
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-md">
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                From
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium text-slate-600">
                To
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                />
              </label>
            </div>
          )}

          {data && (
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <CalendarRange className="h-4 w-4" aria-hidden="true" />
              {formatShortDate(data.period.from)} – {formatShortDate(data.period.to)} (
              {data.period.days} {data.period.days === 1 ? 'day' : 'days'})
            </p>
          )}
        </div>
      </Card>

      {isLoading && <AnalyticsSkeleton />}

      {!isLoading && (isError || !data) && (
        <div className="card">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      )}

      {!isLoading && data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total income"
              value={formatCurrency(data.totals.income, currency)}
              icon={<ArrowUpRight className="h-5 w-5" aria-hidden="true" />}
              accent="income"
            />
            <StatCard
              label="Total expense"
              value={formatCurrency(data.totals.expense, currency)}
              icon={<ArrowDownLeft className="h-5 w-5" aria-hidden="true" />}
              accent="expense"
            />
            <StatCard
              label="Net cash flow"
              value={formatCurrency(data.totals.netCashFlow, currency)}
              caption={
                data.totals.savingsRate === null
                  ? 'No income recorded in this period'
                  : `${formatPercentage(data.totals.savingsRate)} savings rate`
              }
              icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
              accent={data.totals.netCashFlow >= 0 ? 'income' : 'expense'}
            />
            <StatCard
              label="Average daily expense"
              value={formatCurrency(data.averageDailyExpense, currency)}
              caption={`Across ${data.period.days} ${data.period.days === 1 ? 'day' : 'days'}`}
              icon={<CalendarRange className="h-5 w-5" aria-hidden="true" />}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-500">Highest expense category</p>
              {data.highestExpenseCategory ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {data.highestExpenseCategory.categoryName}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 tabular">
                    {formatCurrency(data.highestExpenseCategory.amount, currency)} ·{' '}
                    {formatPercentage(data.highestExpenseCategory.percentage)} of spending
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No expenses in this period.</p>
              )}
            </div>

            <div className="card p-5">
              <p className="text-sm font-medium text-slate-500">Highest spending day</p>
              {data.highestSpendingDay ? (
                <>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {formatShortDate(`${data.highestSpendingDay.date}T00:00:00.000Z`)}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500 tabular">
                    {formatCurrency(data.highestSpendingDay.amount, currency)} spent
                  </p>
                </>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No expenses in this period.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-500">Income trend</p>
              <p className="mt-2 text-sm text-slate-600">
                <ChangeLabel change={data.comparison.incomeChange} />
              </p>
              <p className="mt-1 text-xs text-slate-400 tabular">
                Previous period: {formatCurrency(data.previousTotals.income, currency)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-500">Spending trend</p>
              <p className="mt-2 text-sm text-slate-600">
                <ChangeLabel change={data.comparison.expenseChange} invert />
              </p>
              <p className="mt-1 text-xs text-slate-400 tabular">
                Previous period: {formatCurrency(data.previousTotals.expense, currency)}
              </p>
            </div>
          </div>

          <Card title="Income vs expense" description="Day by day across the period">
            <DailyTrendChart data={data.dailyTrend} currency={currency} />
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card title="Expense by category" description={data.period.label}>
              <ExpenseCategoryChart data={data.expenseByCategory} currency={currency} />
            </Card>

            <Card title="Insights" description="Generated from your own transactions">
              {data.insights.length > 0 ? (
                <InsightList insights={data.insights} />
              ) : (
                <EmptyState
                  icon={<Lightbulb className="h-6 w-6" aria-hidden="true" />}
                  title="No insights yet"
                  message="Record a few transactions and FinanceTrack will start spotting patterns."
                />
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
};
