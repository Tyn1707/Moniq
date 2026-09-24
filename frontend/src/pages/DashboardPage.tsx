import { Link } from 'react-router-dom';
import { ArrowRight, Plus, Receipt } from 'lucide-react';
import { Card } from '../components/ui';
import { Button } from '../components/ui/Button';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { ExpenseCategoryChart, IncomeExpenseChart } from '../components/charts/Charts';
import { TransactionList } from '../components/transactions/TransactionList';
import { useDashboard } from '../hooks/useFinanceData';
import { useTransactionModal } from '../layouts/AppLayout';
import { formatMonth } from '../utils/format';

/**
 * Dashboard (brief §7, §8, §34).
 *
 * One request returns every figure already calculated. The page's only job is to
 * lay them out and handle the three states every data view needs: loading,
 * error, and empty.
 */
export const DashboardPage = () => {
  const { data, isLoading, isError, error, refetch } = useDashboard();
  const { openCreate } = useTransactionModal();

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <div className="card">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  }

  const { currency, summary, currentMonth, expenseByCategory, monthlyTrend, recentTransactions } =
    data;
  const currentMonthLabel = formatMonth(currentMonth.from.slice(0, 7));

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Your financial overview for {currentMonthLabel}.
          </p>
        </div>
        <Button
          onClick={openCreate}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          className="hidden lg:inline-flex"
        >
          Add transaction
        </Button>
      </header>

      <SummaryCards summary={summary} currentMonth={currentMonth} currency={currency} />

      {!data.hasAnyTransactions ? (
        <div className="card">
          <EmptyState
            icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
            title="No transactions yet."
            message="Add your first income or expense and your balance, charts and insights will fill in straight away."
            action={{ label: '+ Add your first transaction', onClick: openCreate }}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card
              title="Income vs expense"
              description="Last six months"
              className="xl:col-span-2"
            >
              <IncomeExpenseChart data={monthlyTrend} currency={currency} />
            </Card>

            <Card title="Expense by category" description={currentMonthLabel}>
              <ExpenseCategoryChart data={expenseByCategory} currency={currency} />
            </Card>
          </div>

          <Card
            title="Recent transactions"
            description="Your latest activity"
            bodyClassName=""
            action={
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                View all
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          >
            <TransactionList
              transactions={recentTransactions}
              currency={currency}
              readOnly
            />
          </Card>
        </>
      )}
    </div>
  );
};
