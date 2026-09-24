import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import clsx from 'clsx';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { useCategories, useCreateTransaction, useUpdateTransaction } from '../../hooks/useFinanceData';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../services/api';
import { PAYMENT_METHOD_LABELS, toDateInputValue } from '../../utils/format';
import type { PaymentMethod, Transaction, TransactionType } from '../../types';

/**
 * Add / edit transaction (brief §9, §13).
 *
 * Validation messages mirror the server's wording so a field rejected locally
 * and the same field rejected by the API read identically. The server remains
 * the authority — this is purely a faster first pass.
 */
const schema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z
    .string()
    .min(1, 'Amount is required.')
    .refine((value) => Number.isFinite(Number(value)), 'Amount must be a valid number.')
    .refine((value) => Number(value) > 0, 'Amount must be greater than 0.'),
  categoryId: z.string().min(1, 'Please select a category.'),
  description: z.string().trim().min(1, 'Description is required.').max(140),
  transactionDate: z.string().min(1, 'Date is required.'),
  paymentMethod: z.string().min(1),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof schema>;

interface TransactionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Present when editing; absent when creating. */
  transaction?: Transaction | null;
  defaultType?: TransactionType;
}

export const TransactionFormModal = ({
  isOpen,
  onClose,
  transaction = null,
  defaultType = 'EXPENSE',
}: TransactionFormModalProps) => {
  const toast = useToast();
  const isEditing = transaction !== null;

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: defaultType,
      amount: '',
      categoryId: '',
      description: '',
      transactionDate: toDateInputValue(),
      paymentMethod: 'CASH',
      notes: '',
    },
  });

  const selectedType = watch('type');
  const { data: categories = [], isLoading: categoriesLoading } = useCategories(selectedType);

  // Re-seed the form whenever the dialog opens, so a previous edit never leaks
  // into the next one.
  useEffect(() => {
    if (!isOpen) return;

    reset(
      transaction
        ? {
            type: transaction.type,
            amount: String(transaction.amount),
            categoryId: transaction.category.id,
            description: transaction.description,
            transactionDate: transaction.transactionDate.slice(0, 10),
            paymentMethod: transaction.paymentMethod,
            notes: transaction.notes ?? '',
          }
        : {
            type: defaultType,
            amount: '',
            categoryId: '',
            description: '',
            transactionDate: toDateInputValue(),
            paymentMethod: 'CASH',
            notes: '',
          },
    );
  }, [isOpen, transaction, defaultType, reset]);

  const currentCategoryId = watch('categoryId');

  // Switching income↔expense invalidates the chosen category, because a
  // category belongs to exactly one type.
  useEffect(() => {
    if (categoriesLoading || categories.length === 0) return;
    if (categories.some((category) => category.id === currentCategoryId)) return;
    setValue('categoryId', '');
  }, [categories, categoriesLoading, currentCategoryId, setValue]);

  const paymentMethods = useMemo(
    () => Object.entries(PAYMENT_METHOD_LABELS) as [PaymentMethod, string][],
    [],
  );

  const onSubmit = handleSubmit(async (values) => {
    const payload = {
      type: values.type,
      amount: Number(values.amount),
      categoryId: values.categoryId,
      description: values.description.trim(),
      transactionDate: values.transactionDate,
      paymentMethod: values.paymentMethod as PaymentMethod,
      notes: values.notes?.trim() ? values.notes.trim() : null,
    };

    try {
      if (isEditing && transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, payload });
        toast.success('Transaction updated successfully.');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Transaction added successfully.');
      }
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        // Surface server-side field errors next to the offending input.
        let matchedField = false;
        for (const fieldError of error.fieldErrors) {
          if (fieldError.field in payload) {
            setError(fieldError.field as keyof FormValues, { message: fieldError.message });
            matchedField = true;
          }
        }
        if (!matchedField) toast.error(error.message);
      } else {
        toast.error('Something went wrong. Please try again.');
      }
    }
  });

  const typeOptions: { value: TransactionType; label: string; icon: typeof ArrowUpCircle }[] = [
    { value: 'EXPENSE', label: 'Expense', icon: ArrowDownCircle },
    { value: 'INCOME', label: 'Income', icon: ArrowUpCircle },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit transaction' : 'Add transaction'}
      description={
        isEditing
          ? 'Your balance and budgets update automatically once you save.'
          : 'Record money coming in or going out.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} isLoading={isSubmitting}>
            {isEditing ? 'Save changes' : 'Add transaction'}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium text-slate-700">Transaction type</legend>
          <div className="grid grid-cols-2 gap-2">
            {typeOptions.map((option) => (
              <label
                key={option.value}
                className={clsx(
                  'flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition',
                  selectedType === option.value
                    ? option.value === 'INCOME'
                      ? 'border-income bg-income-light text-income-dark'
                      : 'border-expense bg-expense-light text-expense-dark'
                    : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                <input
                  type="radio"
                  value={option.value}
                  className="sr-only"
                  {...register('type')}
                />
                <option.icon className="h-4 w-4" aria-hidden="true" />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>

        <Input
          label="Amount"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          placeholder="0"
          required
          error={errors.amount?.message}
          {...register('amount')}
        />

        <Select
          label="Category"
          required
          error={errors.categoryId?.message}
          disabled={categoriesLoading}
          {...register('categoryId')}
        >
          <option value="">
            {categoriesLoading ? 'Loading categories…' : 'Select a category'}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        <Input
          label="Description"
          placeholder="e.g. Lunch at the campus canteen"
          required
          error={errors.description?.message}
          {...register('description')}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Date"
            type="date"
            required
            error={errors.transactionDate?.message}
            {...register('transactionDate')}
          />
          <Select
            label="Payment method"
            error={errors.paymentMethod?.message}
            {...register('paymentMethod')}
          >
            {paymentMethods.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>

        <Textarea
          label="Notes"
          placeholder="Optional"
          hint="Anything you want to remember about this transaction."
          error={errors.notes?.message}
          {...register('notes')}
        />
      </form>
    </Modal>
  );
};
