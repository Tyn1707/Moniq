import { z } from 'zod';
import { amountSchema, dateSchema, idSchema } from './common';

/**
 * A budget covers an explicit period. When the client omits the period we
 * default to the current calendar month, which is the common case (brief §15).
 */
export const createBudgetSchema = z
  .object({
    categoryId: idSchema,
    amount: amountSchema,
    periodStart: dateSchema.optional(),
    periodEnd: dateSchema.optional(),
  })
  .refine(
    (data) => !data.periodStart || !data.periodEnd || data.periodStart <= data.periodEnd,
    { path: ['periodEnd'], message: 'Period end must be on or after period start.' },
  );

export const updateBudgetSchema = z
  .object({
    amount: amountSchema.optional(),
    periodStart: dateSchema.optional(),
    periodEnd: dateSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  })
  .refine(
    (data) => !data.periodStart || !data.periodEnd || data.periodStart <= data.periodEnd,
    { path: ['periodEnd'], message: 'Period end must be on or after period start.' },
  );

export const listBudgetsSchema = z.object({
  /** `YYYY-MM`; defaults to the current month. */
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format.')
    .optional(),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ListBudgetsQuery = z.infer<typeof listBudgetsSchema>;
