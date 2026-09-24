import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Field';
import { Modal } from '../ui/Modal';
import {
  BUDGET_STATUS_LABEL,
  BUDGET_STATUS_TONE,
  Badge,
  ProgressBar,
} from '../ui';
import { useCategories, useCreateBudget, useUpdateBudget } from '../../hooks/useFinanceData';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { formatCurrency, formatPercentage } from '../../utils/format';
import type { Budget, Currency } from '../../types';

/**
 * Budget card (brief §15–§17).
 *
 * Shows spent-of-budget, the remaining amount and a progress bar coloured by
 * status. The percentage label is intentionally *not* clamped — seeing "120%"
 * is the point when a budget is blown, even though the bar itself stops at 100%.
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
    <article className="card space-y-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {budget.category.name}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500 tabular">
            {formatCurrency(budget.spent, currency)} of {formatCurrency(budget.amount, currency)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Badge tone={BUDGET_STATUS_TONE[budget.status]}>
            {BUDGET_STATUS_LABEL[budget.status]}
          </Badge>
          <button
            type="button"
            onClick={() => onEdit(budget)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-primary-600"
            aria-label={`Edit ${budget.category.name} budget`}
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(budget)}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-expense-light hover:text-expense"
            aria-label={`Delete ${budget.category.name} budget`}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <ProgressBar
        value={budget.usagePercentage}
        status={budget.status}
        label={`${budget.category.name} budget usage`}
      />

      <footer className="flex items-center justify-between text-sm">
        <span className="font-semibold text-slate-700 tabular">
          {formatPercentage(budget.usagePercentage)} used
        </span>
        <span className={clsx('tabular', isOverspent ? 'text-expense-dark' : 'text-slate-500')}>
          {isOverspent
            ? `${formatCurrency(Math.abs(budget.remaining), currency)} over budget`
            : `${formatCurrency(budget.remaining, currency)} left`}
        </span>
      </footer>
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
          <div className="rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
            Category: <span className="font-medium text-slate-900">{budget.category.name}</span>
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
          <p className="text-sm text-slate-500">
            Every expense category already has a budget this month.
          </p>
        )}

        <Input
          label="Monthly budget amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0"
          required
          error={errors.amount?.message}
          {...register('amount')}
        />
      </form>
    </Modal>
  );
};
