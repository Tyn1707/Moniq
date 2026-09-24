import { z } from 'zod';
import { PAYMENT_METHODS, TRANSACTION_TYPES } from '../utils/constants';
import { amountSchema, dateSchema, idSchema } from './common';

export const createTransactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES, {
    errorMap: () => ({ message: 'Transaction type must be either income or expense.' }),
  }),
  amount: amountSchema,
  categoryId: idSchema.refine((value) => value.length > 0, 'Please select a category.'),
  description: z
    .string()
    .trim()
    .min(1, 'Description is required.')
    .max(140, 'Description must be 140 characters or fewer.'),
  transactionDate: dateSchema,
  paymentMethod: z.enum(PAYMENT_METHODS).default('CASH'),
  notes: z.string().trim().max(500, 'Notes must be 500 characters or fewer.').optional().nullable(),
});

/** Update accepts any subset, but must change at least one field. */
export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

const datePresetSchema = z.enum(['all', 'today', 'this_week', 'this_month', 'custom']);

export const listTransactionsSchema = z
  .object({
    search: z.string().trim().max(120).optional(),
    type: z.enum(['ALL', ...TRANSACTION_TYPES]).default('ALL'),
    categoryId: z.string().trim().max(64).optional(),
    datePreset: datePresetSchema.default('all'),
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    sort: z.enum(['newest', 'oldest', 'highest', 'lowest']).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(10),
  })
  .refine(
    (data) => data.datePreset !== 'custom' || (data.dateFrom !== undefined && data.dateTo !== undefined),
    { path: ['dateFrom'], message: 'A custom date filter needs both a start and end date.' },
  )
  .refine((data) => !data.dateFrom || !data.dateTo || data.dateFrom <= data.dateTo, {
    path: ['dateTo'],
    message: 'End date must be on or after the start date.',
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type ListTransactionsQuery = z.infer<typeof listTransactionsSchema>;
