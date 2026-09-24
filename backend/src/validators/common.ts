import { z } from 'zod';
import { MAX_AMOUNT } from '../utils/constants';

/** Monetary input: must be a positive, finite number (brief §29). */
export const amountSchema = z
  .union([z.number(), z.string().trim().min(1)], {
    // Covers a missing, null, or empty amount. Without this, Zod reports its
    // generic "Invalid input" for the union itself.
    errorMap: () => ({ message: 'Amount is required.' }),
  })
  .transform((value, ctx) => {
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount must be a valid number.' });
      return z.NEVER;
    }
    if (parsed <= 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount must be greater than 0.' });
      return z.NEVER;
    }
    if (parsed > MAX_AMOUNT) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is too large.' });
      return z.NEVER;
    }
    return Math.round(parsed * 100) / 100;
  });

/** Non-negative monetary input, used for the onboarding initial balance. */
export const nonNegativeAmountSchema = z
  .union([z.number(), z.string().trim()], {
    errorMap: () => ({ message: 'Amount must be a valid number.' }),
  })
  .transform((value, ctx) => {
    const parsed = typeof value === 'number' ? value : Number(value === '' ? 0 : value);
    if (!Number.isFinite(parsed)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount must be a valid number.' });
      return z.NEVER;
    }
    if (parsed < 0) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount cannot be negative.' });
      return z.NEVER;
    }
    if (parsed > MAX_AMOUNT) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Amount is too large.' });
      return z.NEVER;
    }
    return Math.round(parsed * 100) / 100;
  });

/** Accepts `YYYY-MM-DD` or a full ISO timestamp. */
export const dateSchema = z
  .string({ required_error: 'Date is required.', invalid_type_error: 'Date is required.' })
  .trim()
  .min(1, 'Date is required.')
  .transform((value, ctx) => {
    const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
    const parsed = new Date(isDateOnly ? `${value}T00:00:00.000Z` : value);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Please provide a valid date.' });
      return z.NEVER;
    }
    return parsed;
  });

export const idSchema = z.string().trim().min(1, 'Identifier is required.').max(64);

export const idParamSchema = z.object({ id: idSchema });

export const categoryNameSchema = z
  .string()
  .trim()
  .min(1, 'Category name is required.')
  .max(50, 'Category name must be 50 characters or fewer.');
