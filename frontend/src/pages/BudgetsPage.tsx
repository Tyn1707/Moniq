import { useState } from 'react';
import { PiggyBank, Plus, Target } from 'lucide-react';
import clsx from 'clsx';
import { Badge, Card, ProgressBar, StatTile } from '../components/ui';
import { Button } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { BudgetListSkeleton } from '../components/ui/Skeleton';
import { EmptyState, ErrorState } from '../components/ui/States';
import { AnimatedCurrency, AnimatedPercentage, Reveal, staggerClass } from '../components/ui/Motion';
import { PageHeader } from '../components/layout/PageHeader';
import { BudgetCard, BudgetFormModal } from '../components/budgets/BudgetComponents';
import { useBudgets, useDeleteBudget } from '../hooks/useFinanceData';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { ApiError } from '../services/api';
import { formatCurrency, formatMonth } from '../utils/format';
import type { Budget, BudgetStatus } from '../types';

/**
 * Budgets (brief §15–§17).
 *
 * Spent, remaining, usage and status all arrive from the API. The page adds a
 * roll-up so a user can answer "am I on budget overall?" without mentally summing
 * the cards, and sorts the worst offenders to the top — an exceeded budget is the
 * only thing on this page that needs acting on.
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

  const STATUS_ORDER: Record<BudgetStatus, number> = { EXCEEDED: 0, WARNING: 1, SAFE: 2 };
  const budgets = [...(data?.items ?? [])].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.usagePercentage - a.usagePercentage,
  );

  /** Overall status mirrors the worst individual budget. */
  const overallStatus: BudgetStatus = budgets.some((budget) => budget.status === 'EXCEEDED')
    ? 'EXCEEDED'
    : budgets.some((budget) => budget.status === 'WARNING')
      ? 'WARNING'
      : 'SAFE';

  const exceededCount = budgets.filter((budget) => budget.status === 'EXCEEDED').length;
  const warningCount = budgets.filter((budget) => budget.status === 'WARNING').length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={data ? formatMonth(data.period.month) : 'This month'}
        title="Budgets"
        description="Set a monthly limit per expense category and track how much is left."
        action={
          <Button onClick={openCreate} leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}>
            Create budget
          </Button>
        }
      />

      {isLoading && <BudgetListSkeleton />}

      {!isLoading && (isError || !data) && (
        <div className="surface">
          <ErrorState error={error} onRetry={() => void refetch()} />
        </div>
      )}

      {!isLoading && data && budgets.length === 0 && (
        <Reveal>
          <div className="surface">
            <EmptyState
              icon={<PiggyBank className="h-6 w-6" aria-hidden="true" />}
              title="No budgets created yet."
              message="Set a monthly limit for the categories you want to keep an eye on, and FinanceTrack will track your progress against them."
              action={{ label: 'Create Budget', onClick: openCreate }}
            />
          </div>
        </Reveal>
      )}

      {!isLoading && data && budgets.length > 0 && (
        <>
          <Reveal>
            <Card
              title="This month at a glance"
              description={formatMonth(data.period.month)}
              action={
                exceededCount > 0 ? (
                  <Badge tone="expense" dot>
                    {exceededCount} exceeded
                  </Badge>
                ) : warningCount > 0 ? (
                  <Badge tone="warn" dot>
                    {warningCount} near limit
                  </Badge>
                ) : (
                  <Badge tone="income" dot>
                    All on track
                  </Badge>
                )
              }
            >
              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
                  <Figure label="Budgeted" value={<AnimatedCurrency value={data.totals.budgeted} currency={currency} />} />
                  <Figure
                    label="Spent"
                    tone="expense"
                    value={<AnimatedCurrency value={data.totals.spent} currency={currency} />}
                  />
                  <Figure
                    label="Remaining"
                    tone={data.totals.remaining < 0 ? 'expense' : 'income'}
                    value={<AnimatedCurrency value={data.totals.remaining} currency={currency} />}
                  />
                  <Figure
                    label="Used"
                    value={<AnimatedPercentage value={data.totals.usagePercentage} />}
                  />
                </div>
                <ProgressBar
                  value={data.totals.usagePercentage}
                  status={overallStatus}
                  label="Overall budget usage"
                />
              </div>
            </Card>
          </Reveal>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {budgets.map((budget, index) => (
              <div key={budget.id} className={clsx('animate-reveal-up', staggerClass(index + 1))}>
                <BudgetCard
                  budget={budget}
                  currency={currency}
                  onEdit={(target) => setFormState({ open: true, budget: target })}
                  onDelete={setPendingDelete}
                />
              </div>
            ))}
          </div>

          {/* Encourage broadening coverage once the basics are in place. */}
          <Reveal delayStep={2}>
            <StatTile
              label="Tip"
              icon={<Target className="h-4 w-4" aria-hidden="true" />}
              tone="accent"
              value={`${budgets.length} ${budgets.length === 1 ? 'category' : 'categories'} budgeted`}
              caption="Budgets only count expenses inside their own month, so last month's spending never affects this month's progress."
            />
          </Reveal>
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
            ? `Are you sure you want to delete the ${pendingDelete.category.name} budget of ${formatCurrency(
                pendingDelete.amount,
                currency,
              )}? Your transactions stay untouched.`
            : ''
        }
        isLoading={deleteMutation.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
};

const Figure = ({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'income' | 'expense';
}) => (
  <div>
    <p className="label-eyebrow">{label}</p>
    <p
      className={clsx(
        'mt-1 text-[1.0625rem] font-bold tracking-tight',
        tone === 'income' ? 'text-income-600' : tone === 'expense' ? 'text-expense-600' : 'text-ink-900',
      )}
    >
      {value}
    </p>
  </div>
);
