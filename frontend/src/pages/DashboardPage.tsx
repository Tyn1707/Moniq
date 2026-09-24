import { Link } from 'react-router-dom';
import { ArrowRight, Lightbulb, Plus, Receipt } from 'lucide-react';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { Reveal } from '../components/ui/Motion';
import { PageHeader } from '../components/layout/PageHeader';
import { BalanceHero, SummaryTiles } from '../components/dashboard/SummaryCards';
import { InsightList } from '../components/dashboard/InsightList';
import { ExpenseCategoryChart, IncomeExpenseChart } from '../components/charts/Charts';
import { TransactionList } from '../components/transactions/TransactionList';
import { useAnalytics, useDashboard } from '../hooks/useFinanceData';
import { useTransactionModal } from '../layouts/AppLayout';
import { formatMonth } from '../utils/format';

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
              message="Keep recording transactions and FinanceTrack will start spotting patterns in your spending."
              compact
            />
          </div>
        </Reveal>
      )}
    </div>
  );
};
