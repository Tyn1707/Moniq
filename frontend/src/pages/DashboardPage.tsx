import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb, LineChart, Plus, Receipt, Wallet } from 'lucide-react';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { AnimatedCurrency, Reveal } from '../components/ui/Motion';
import { PageHeader } from '../components/layout/PageHeader';
import { BalanceHero, SummaryTiles } from '../components/dashboard/SummaryCards';
import { InsightList } from '../components/dashboard/InsightList';
import { ExpenseCategoryChart, IncomeExpenseChart, InteractiveLineChart } from '../components/charts/Charts';
import { TransactionList } from '../components/transactions/TransactionList';
import { useAnalytics, useBalanceHistory, useDashboard } from '../hooks/useFinanceData';
import { useTransactionModal } from '../layouts/AppLayout';
import { formatMonth } from '../utils/format';
import type { ChartRange } from '../types';

/**
 * Dashboard (brief §7, §8, §34).
 *
 * A single request returns every figure already calculated. The layout is ordered
 * by how urgently a user needs each answer: balance first, then this month's
 * totals, then where the money went, then what the app noticed, then the ledger.
 */
export const DashboardPage = () => {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  // Insights come from the analytics endpoint; a failure here must not take the
  // dashboard down, so the section is simply omitted if it has nothing.
  const { data: analytics } = useAnalytics('this_month');
  const { openCreate } = useTransactionModal();

  const [balanceRange, setBalanceRange] = useState<ChartRange>('1M');
  const balanceHistory = useBalanceHistory(balanceRange);

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="surface">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const { currency, summary, currentMonth, expenseByCategory, monthlyTrend, recentTransactions } = data;
  const monthLabel = formatMonth(currentMonth.from.slice(0, 7));
  const insights = analytics?.insights.filter((insight) => insight.id !== 'no-data') ?? [];
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={monthLabel}
        title="Dashboard"
        description="Everything below is calculated from your own transactions."
        action={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            Add transaction
          </Button>
        }
      />

      <Reveal>
        <BalanceHero
          summary={summary}
          currentMonth={currentMonth}
          monthlyTrend={monthlyTrend}
          currency={currency}
        />
      </Reveal>

      {data.netWorth.hasInvestments && (
        <Reveal delayStep={1}>
          <Card
            title="Net worth"
            description="Cash balance plus live investment value"
            action={
              <Link
                to="/portfolio"
                className="inline-flex items-center gap-1 text-[0.8125rem] font-bold text-accent-600 transition hover:text-accent-700"
              >
                Portfolio
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            }
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="sm:border-r sm:border-ink-100">
                <p className="label-eyebrow">Total net worth</p>
                <AnimatedCurrency
                  value={data.netWorth.total}
                  currency={currency}
                  as="p"
                  className="mt-1 font-display text-2xl font-black tracking-tight text-ink-900"
                />
              </div>
              <div>
                <p className="label-eyebrow">Cash</p>
                <AnimatedCurrency
                  value={data.netWorth.cash}
                  currency={currency}
                  as="p"
                  className="mt-1 font-display text-xl font-bold text-ink-700"
                />
              </div>
              <div>
                <p className="label-eyebrow flex items-center gap-1.5">
                  <LineChart className="h-3 w-3 text-accent-500" aria-hidden="true" />
                  Investments
                </p>
                <AnimatedCurrency
                  value={data.netWorth.investments}
                  currency={currency}
                  as="p"
                  className="mt-1 font-display text-xl font-bold text-accent-700"
                />
              </div>
            </div>
          </Card>
        </Reveal>
      )}

      {!data.hasAnyTransactions ? (
        <Reveal delayStep={1}>
          <div className="surface">
            <EmptyState
              icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
              title="No transactions yet."
              message="Add your first income or expense and your balance, charts and insights will fill in straight away."
              action={{ label: '+ Add your first transaction', onClick: openCreate }}
            />
          </div>
        </Reveal>
      ) : (
        <>
          <Reveal delayStep={1}>
            <SummaryTiles summary={summary} currency={currency} />
          </Reveal>

          <Reveal delayStep={2}>
            <Card
              title="Balance over time"
              description="Your running balance, derived from every transaction"
              action={
                <span className="hidden items-center gap-1.5 text-[0.75rem] font-semibold text-ink-400 sm:flex">
                  <Wallet className="h-3.5 w-3.5 text-accent-500" aria-hidden="true" />
                  {balanceHistory.data
                    ? `${balanceHistory.data.points.length} days`
                    : ''}
                </span>
              }
            >
              <InteractiveLineChart
                data={(balanceHistory.data?.points ?? []).map((point) => ({
                  date: point.date,
                  value: point.balance,
                }))}
                currency={currency}
                range={balanceRange}
                onRangeChange={setBalanceRange}
                seriesLabel="Balance"
                isLoading={balanceHistory.isLoading}
              />
            </Card>
          </Reveal>

          {/* 3:2 split rather than equal columns — the trend chart needs the
              horizontal room, the donut does not. */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
            <Reveal delayStep={2} className="xl:col-span-3">
              <Card title="Income vs expense" description="Last six months" className="h-full">
                <IncomeExpenseChart data={monthlyTrend} currency={currency} />
              </Card>
            </Reveal>

            <Reveal delayStep={3} className="xl:col-span-2">
              <Card title="Where your money went" description={monthLabel} className="h-full">
                <ExpenseCategoryChart data={expenseByCategory} currency={currency} />
              </Card>
            </Reveal>
          </div>

          {insights.length > 0 && (
            <Reveal delayStep={4}>
              <Card
                title="What we noticed"
                description="Generated from your own transactions"
                action={
                  <Link
                    to="/analytics"
                    className="inline-flex items-center gap-1 text-[0.8125rem] font-bold text-accent-600 transition hover:text-accent-700"
                  >
                    All insights
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                }
              >
                <InsightList insights={insights} limit={3} />
              </Card>
            </Reveal>
          )}

          <Reveal delayStep={5}>
            <Card
              title="Recent activity"
              description="Your latest transactions"
              padding="flush"
              action={
                <Link
                  to="/transactions"
                  className="inline-flex items-center gap-1 text-[0.8125rem] font-bold text-accent-600 transition hover:text-accent-700"
                >
                  View all
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              }
            >
              <div className="mt-4">
                <TransactionList transactions={recentTransactions} currency={currency} readOnly />
              </div>
            </Card>
          </Reveal>
        </>
      )}

      {/* Nudge shown only when there is data but nothing worth saying about it. */}
      {data.hasAnyTransactions && insights.length === 0 && (
        <Reveal delayStep={6}>
          <div className="surface">
            <EmptyState
              icon={<Lightbulb className="h-6 w-6" aria-hidden="true" />}
              title="Not enough data for insights yet"
              message="Keep recording transactions and Moniq will start spotting patterns in your spending."
              compact
            />
          </div>
        </Reveal>
      )}
    </div>
  );
};
