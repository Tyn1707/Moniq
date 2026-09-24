import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarRange,
  Flame,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import clsx from 'clsx';
import { Card, SegmentedControl, StatTile, type SegmentOption } from '../components/ui';
import { AnalyticsSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { AnimatedCurrency, AnimatedPercentage, Reveal } from '../components/ui/Motion';
import { PageHeader } from '../components/layout/PageHeader';
import { DailyTrendChart, ExpenseCategoryChart } from '../components/charts/Charts';
import { InsightList } from '../components/dashboard/InsightList';
import { useAnalytics } from '../hooks/useFinanceData';
import { formatCurrency, formatPercentage, formatShortDate, toDateInputValue } from '../utils/format';
import type { AnalyticsPeriod } from '../types';

/**
 * Analytics (brief §18, §19).
 *
 * The period selector is the only real control; everything else is a projection of
 * the server's response for that period. Comparisons against the previous
 * equivalent period are computed server-side too, so "up 20%" means the same thing
 * here as it does inside an insight.
 */

const PERIOD_OPTIONS: SegmentOption<AnalyticsPeriod>[] = [
  { value: 'this_week', label: 'Week' },
  { value: 'this_month', label: 'Month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'last_3_months', label: '3 months' },
  { value: 'custom', label: 'Custom' },
];

/**
 * Trend label. `invert` flips the good/bad colouring for expenses, where an
 * increase is the bad direction — the same arrow must not mean "good" in both.
 */
const ChangeLabel = ({ change, invert = false }: { change: number | null; invert?: boolean }) => {
  if (change === null) return <span className="text-ink-400">No comparable previous period</span>;
  if (change === 0) return <span className="text-ink-500">Unchanged from last period</span>;

  const isUp = change > 0;
  const isGood = invert ? !isUp : isUp;
  const Icon = isUp ? TrendingUp : TrendingDown;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 font-semibold',
        isGood ? 'text-income-600' : 'text-expense-600',
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {formatPercentage(Math.abs(change))} vs last period
    </span>
  );
};

const dateInputClasses =
  'h-10 rounded-xl border border-ink-200 bg-white px-3 text-[0.8125rem] font-medium text-ink-700 shadow-subtle transition focus:border-accent-500 focus:ring-4 focus:ring-accent-100';

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
      <PageHeader
        eyebrow="Analysis"
        title="Insights"
        description="Understand your spending patterns over a period you choose."
      />

      <Reveal>
        <Card padding="tight">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SegmentedControl
              label="Select analytics period"
              options={PERIOD_OPTIONS}
              value={period}
              onChange={setPeriod}
            />

            {data && (
              <p className="flex items-center gap-1.5 px-1 text-[0.75rem] font-medium text-ink-500">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden="true" />
                {formatShortDate(data.period.from)} – {formatShortDate(data.period.to)}
                <span className="text-ink-400">
                  · {data.period.days} {data.period.days === 1 ? 'day' : 'days'}
                </span>
              </p>
            )}
          </div>

          {period === 'custom' && (
            <div className="mt-3 grid animate-reveal-up grid-cols-2 gap-3 sm:max-w-md">
              <label className="flex flex-col gap-1 label-eyebrow">
                From
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className={dateInputClasses}
                />
              </label>
              <label className="flex flex-col gap-1 label-eyebrow">
                To
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className={dateInputClasses}
                />
              </label>
            </div>
          )}
        </Card>
      </Reveal>

      {isLoading && <AnalyticsSkeleton />}

      {!isLoading && (isError || !data) && (
        <div className="surface">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      )}

      {!isLoading && data && (
        <>
          <Reveal delayStep={1}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile
                label="Total income"
                tone="income"
                icon={<ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
                value={<AnimatedCurrency value={data.totals.income} currency={currency} />}
                caption={<ChangeLabel change={data.comparison.incomeChange} />}
              />
              <StatTile
                label="Total expense"
                tone="expense"
                icon={<ArrowDownLeft className="h-4 w-4" aria-hidden="true" />}
                value={<AnimatedCurrency value={data.totals.expense} currency={currency} />}
                caption={<ChangeLabel change={data.comparison.expenseChange} invert />}
              />
              <StatTile
                label="Net cash flow"
                tone={data.totals.netCashFlow >= 0 ? 'accent' : 'expense'}
                icon={<Wallet className="h-4 w-4" aria-hidden="true" />}
                value={<AnimatedCurrency value={data.totals.netCashFlow} currency={currency} />}
                caption={
                  data.totals.savingsRate === null ? (
                    'No income recorded in this period'
                  ) : (
                    <>
                      <AnimatedPercentage
                        value={data.totals.savingsRate}
                        className="font-semibold text-ink-700"
                      />{' '}
                      savings rate
                    </>
                  )
                }
              />
              <StatTile
                label="Avg daily expense"
                icon={<CalendarRange className="h-4 w-4" aria-hidden="true" />}
                value={<AnimatedCurrency value={data.averageDailyExpense} currency={currency} />}
                caption={`Across ${data.period.days} ${data.period.days === 1 ? 'day' : 'days'}`}
              />
            </div>
          </Reveal>

          <Reveal delayStep={2}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Highlight
                label="Highest expense category"
                icon={<Flame className="h-4 w-4" aria-hidden="true" />}
                heading={data.highestExpenseCategory?.categoryName ?? null}
                detail={
                  data.highestExpenseCategory
                    ? `${formatCurrency(data.highestExpenseCategory.amount, currency)} · ${formatPercentage(
                        data.highestExpenseCategory.percentage,
                      )} of spending`
                    : null
                }
              />
              <Highlight
                label="Highest spending day"
                icon={<CalendarRange className="h-4 w-4" aria-hidden="true" />}
                heading={
                  data.highestSpendingDay
                    ? formatShortDate(`${data.highestSpendingDay.date}T00:00:00.000Z`)
                    : null
                }
                detail={
                  data.highestSpendingDay
                    ? `${formatCurrency(data.highestSpendingDay.amount, currency)} spent`
                    : null
                }
              />
            </div>
          </Reveal>

          <Reveal delayStep={3}>
            <Card title="Income vs expense" description="Day by day across the period">
              <DailyTrendChart data={data.dailyTrend} currency={currency} />
            </Card>
          </Reveal>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Reveal delayStep={4}>
              <Card
                title="Expense by category"
                description={data.period.label}
                className="h-full"
              >
                <ExpenseCategoryChart data={data.expenseByCategory} currency={currency} />
              </Card>
            </Reveal>

            <Reveal delayStep={5}>
              <Card
                title="Insights"
                description="Generated from your own transactions"
                className="h-full"
              >
                {data.insights.length > 0 ? (
                  <InsightList insights={data.insights} />
                ) : (
                  <EmptyState
                    icon={<Lightbulb className="h-6 w-6" aria-hidden="true" />}
                    title="No insights yet"
                    message="Record a few transactions and FinanceTrack will start spotting patterns."
                    compact
                  />
                )}
              </Card>
            </Reveal>
          </div>
        </>
      )}
    </div>
  );
};

const Highlight = ({
  label,
  icon,
  heading,
  detail,
}: {
  label: string;
  icon: React.ReactNode;
  heading: string | null;
  detail: string | null;
}) => (
  <div className="surface-interactive p-5">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
        {icon}
      </span>
      <p className="label-eyebrow">{label}</p>
    </div>
    {heading ? (
      <>
        <p className="mt-3 text-lg font-bold tracking-tight text-ink-900">{heading}</p>
        <p className="money mt-0.5 text-[0.8125rem] text-ink-500">{detail}</p>
      </>
    ) : (
      <p className="mt-3 text-[0.875rem] text-ink-400">No expenses in this period.</p>
    )}
  </div>
);
