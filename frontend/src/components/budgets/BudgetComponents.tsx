import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, PiggyBank, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../ui/Button';
import { AmountInput, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { BUDGET_STATUS_LABEL, BUDGET_STATUS_TONE, Badge, RingProgress } from '../ui';
import { AnimatedPercentage } from '../ui/Motion';
import { useCategories, useCreateBudget, useUpdateBudget } from '../../hooks/useFinanceData';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { formatCurrency } from '../../utils/format';
import type { Budget, Currency } from '../../types';

/**
 * Budget card (brief §15–§17).
 *
 * A ring gauge rather than a flat bar: "how much of my allowance is left" is a
 * proportion question, and a dial answers it faster than a line. It also frees the
 * horizontal space for the figures instead of stacking them above a bar.
 *
 * The percentage label is deliberately not clamped — seeing "120%" is the entire
 * point when a budget is blown, even though the ring itself stops at full.
 */
export const BudgetCard = ({
  budget,
  currency,
  onEdit,
  onDelete,
}: {
  budget: Budget;
  currency: Currency;
  onEdit: (budget: Budget) => void;
  onDelete: (budget: Budget) => void;
}) => {
  const isOverspent = budget.remaining < 0;

  return (
    <article className="surface-interactive group flex items-center gap-5 p-5">
      <RingProgress
        value={budget.usagePercentage}
        status={budget.status}
        label={`${budget.category.name} budget usage`}
        size={92}
        strokeWidth={9}
      >
        <AnimatedPercentage
          value={budget.usagePercentage}
          className="font-display text-[0.9375rem] font-bold text-ink-900"
        />
        <span className="text-[0.5625rem] font-bold uppercase tracking-wide text-ink-400">used</span>
      </RingProgress>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-[0.9375rem] font-bold tracking-tight text-ink-900">
              {budget.category.name}
            </h3>
            <p className="money mt-0.5 text-[0.8125rem] text-ink-500">
              {formatCurrency(budget.spent, currency)} of {formatCurrency(budget.amount, currency)}
            </p>
          </div>
          <Badge tone={BUDGET_STATUS_TONE[budget.status]} dot>
            {BUDGET_STATUS_LABEL[budget.status]}
          </Badge>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p
            className={clsx(
              'money text-[0.8125rem] font-bold',
              isOverspent ? 'text-expense-600' : 'text-income-600',
            )}
          >
            {isOverspent
              ? `${formatCurrency(Math.abs(budget.remaining), currency)} over budget`
              : `${formatCurrency(budget.remaining, currency)} left`}
          </p>

          {/* Actions stay hidden until hover on pointer devices, so a wall of
              budget cards is not also a wall of icons. */}
          <div className="flex items-center gap-0.5 opacity-100 transition-opacity duration-200 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onEdit(budget)}
              className="press rounded-lg p-2 text-ink-400 transition hover:bg-accent-50 hover:text-accent-600"
              aria-label={`Edit ${budget.category.name} budget`}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(budget)}
              className="press rounded-lg p-2 text-ink-400 transition hover:bg-expense-50 hover:text-expense-600"
              aria-label={`Delete ${budget.category.name} budget`}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

// ---------------------------------------------------------------------------

const schema = z.object({
  categoryId: z.string().min(1, 'Please select a category.'),
  amount: z
    .string()
    .min(1, 'Amount is required.')
    .refine((value) => Number.isFinite(Number(value)), 'Amount must be a valid number.')
    .refine((value) => Number(value) > 0, 'Amount must be greater than 0.'),
});

type FormValues = z.infer<typeof schema>;

interface BudgetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  budget?: Budget | null;
  /** Categories that already have a budget this period, to avoid a 409. */
  usedCategoryIds: string[];
}

export const BudgetFormModal = ({
  isOpen,
  onClose,
  budget = null,
  usedCategoryIds,
}: BudgetFormModalProps) => {
  const toast = useToast();
  const { user } = useAuth();
  const isEditing = budget !== null;

  // Budgets only apply to spending, so only expense categories are offered.
  const { data: categories = [], isLoading: categoriesLoading } = useCategories('EXPENSE');
  const createMutation = useCreateBudget();
  const updateMutation = useUpdateBudget();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { categoryId: '', amount: '' },
  });

  useEffect(() => {
    if (!isOpen) return;
    reset(
      budget
        ? { categoryId: budget.category.id, amount: String(budget.amount) }
        : { categoryId: '', amount: '' },
    );
  }, [isOpen, budget, reset]);

  const availableCategories = categories.filter(
    (category) => category.id === budget?.category.id || !usedCategoryIds.includes(category.id),
  );

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEditing && budget) {
        await updateMutation.mutateAsync({ id: budget.id, amount: Number(values.amount) });
        toast.success('Budget updated successfully.');
      } else {
        await createMutation.mutateAsync({
          categoryId: values.categoryId,
          amount: Number(values.amount),
        });
        toast.success('Budget created successfully.');
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        const fieldError = error.fieldErrors[0];
        if (fieldError && (fieldError.field === 'amount' || fieldError.field === 'categoryId')) {
          setError(fieldError.field, { message: fieldError.message });
        } else {
          toast.error(error.message);
        }
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
      title={isEditing ? `Edit ${budget.category.name} budget` : 'Create budget'}
      description="Budgets cover the current calendar month."
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} isLoading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Create budget'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {isEditing ? (
          <div className="surface-sunken px-3.5 py-3 text-[0.8125rem] text-ink-600">
            Category <span className="font-bold text-ink-900">{budget.category.name}</span>
          </div>
        ) : (
          <Select
            label="Category"
            required
            error={errors.categoryId?.message}
            disabled={categoriesLoading}
            {...register('categoryId')}
          >
            <option value="">
              {categoriesLoading ? 'Loading categories…' : 'Select an expense category'}
            </option>
            {availableCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        )}

        {!isEditing && availableCategories.length === 0 && !categoriesLoading && (
          <p className="text-[0.8125rem] text-ink-500">
            Every expense category already has a budget this month.
          </p>
        )}

        <AmountInput
          label="Monthly budget amount"
          currencyLabel={user?.currency ?? 'IDR'}
          type="number"
          step="0.01"
          min="0"
          placeholder="0"
          required
          error={errors.amount?.message}
          {...register('amount')}
        />
      </form>
    </Modal>
  );
};
