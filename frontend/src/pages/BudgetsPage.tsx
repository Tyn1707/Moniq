import { useState } from 'react';
import { PiggyBank, Plus } from 'lucide-react';
import { Card, ProgressBar } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BudgetListSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { BudgetCard, BudgetFormModal } from '../components/budgets/BudgetComponents';
import { useBudgets, useDeleteBudget } from '../hooks/useFinanceData';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../services/api';
import { formatCurrency, formatMonth, formatPercentage } from '../utils/format';
import type { Budget, BudgetStatus } from '../types';

/**
 * Budgets (brief §15–§17).
 *
 * Spent, remaining, usage and status all arrive from the API. The page adds a
 * roll-up header so a user can answer "am I still on budget overall?" without
 * summing the individual cards themselves.
 */
export const BudgetsPage = () => {
  const { user } = useAuth();
  const toast = useToast();
  const currency = user?.currency ?? 'IDR';

  const { data, isLoading, isError, error, refetch } = useBudgets();
  const deleteMutation = useDeleteBudget();

  const [formState, setFormState] = useState<{ open: boolean; budget: Budget | null }>({
    open: false,
    budget: null,
  });
  const [pendingDelete, setPendingDelete] = useState<Budget | null>(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast.success('Budget deleted successfully.');
      setPendingDelete(null);
    } catch (deleteError) {
      toast.error(
        deleteError instanceof ApiError
          ? deleteError.message
          : 'Something went wrong. Please try again.',
      );
    }
  };

  const openCreate = () => setFormState({ open: true, budget: null });

  /** Overall status mirrors the worst individual budget. */
  const overallStatus = ((): BudgetStatus => {
    if (!data) return 'SAFE';
    if (data.items.some((budget) => budget.status === 'EXCEEDED')) return 'EXCEEDED';
    if (data.items.some((budget) => budget.status === 'WARNING')) return 'WARNING';
    return 'SAFE';
  })();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">Budgets</h1>
          <p className="text-sm text-slate-500">
            {data ? formatMonth(data.period.month) : 'Set a monthly limit per expense category.'}
          </p>
        </div>
        <Button
          onClick={openCreate}
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
        >
          Create budget
        </Button>
      </header>

      {isLoading && <BudgetListSkeleton />}

      {!isLoading && (isError || !data) && (
        <div className="card">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      )}

      {!isLoading && data && data.items.length === 0 && (
        <div className="card">
          <EmptyState
            icon={<PiggyBank className="h-6 w-6" aria-hidden="true" />}
            title="No budgets created yet."
            message="Set a monthly limit for the categories you want to keep an eye on, and FinanceTrack will track your progress against them."
            action={{ label: 'Create Budget', onClick: openCreate }}
          />
        </div>
      )}

      {!isLoading && data && data.items.length > 0 && (
        <>
          <Card title="This month at a glance">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Budgeted
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 tabular">
                    {formatCurrency(data.totals.budgeted, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Spent</p>
                  <p className="mt-1 text-lg font-semibold text-expense-dark tabular">
                    {formatCurrency(data.totals.spent, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Remaining
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold tabular ${
                      data.totals.remaining < 0 ? 'text-expense-dark' : 'text-income-dark'
                    }`}
                  >
                    {formatCurrency(data.totals.remaining, currency)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Used</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900 tabular">
                    {formatPercentage(data.totals.usagePercentage)}
                  </p>
                </div>
              </div>
              <ProgressBar
                value={data.totals.usagePercentage}
                status={overallStatus}
                label="Overall budget usage"
              />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {data.items.map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                currency={currency}
                onEdit={(target) => setFormState({ open: true, budget: target })}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        </>
      )}

      <BudgetFormModal
        isOpen={formState.open}
        onClose={() => setFormState((state) => ({ ...state, open: false }))}
        budget={formState.budget}
        usedCategoryIds={data?.items.map((budget) => budget.category.id) ?? []}
      />

      <ConfirmDialog
        isOpen={pendingDelete !== null}
        title="Delete this budget?"
        message={
          pendingDelete
            ? `Are you sure you want to delete the ${pendingDelete.category.name} budget? Your transactions stay untouched.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};
