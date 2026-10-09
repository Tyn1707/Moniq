import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../utils/constants';
import { amountSchema } from './common';

/**
 * Portfolio input schemas. As everywhere else, the validator is the only trust
 * boundary — a service never sees an unvalidated field.
 */

/** A Yahoo Finance ticker, e.g. "BBCA.JK". Letters, digits and `.^-=` only. */
const symbolSchema = z
  .string({ required_error: 'Symbol is required.' })
  .trim()
  .min(1, 'Symbol is required.')
  .max(20, 'Symbol must be 20 characters or fewer.')
  .regex(/^[A-Za-z0-9.^=-]+$/, 'Symbol contains invalid characters.');

const nameSchema = z
  .string()
  .trim()
  .max(80, 'Name must be 80 characters or fewer.')
  .optional();

/** Share count: a positive, finite number. Reuses the money transform's rigour. */
const sharesSchema = amountSchema;

const currencySchema = z.enum(SUPPORTED_CURRENCIES);

export const createHoldingSchema = z.object({
  symbol: symbolSchema,
  name: nameSchema,
  shares: sharesSchema,
  avgBuyPrice: amountSchema,
  currency: currencySchema.optional(),
});

export const updateHoldingSchema = z
  .object({
    name: z.string().trim().min(1, 'Name is required.').max(80).optional(),
    shares: sharesSchema.optional(),
    avgBuyPrice: amountSchema.optional(),
    currency: currencySchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

export const searchSymbolsSchema = z.object({
  q: z
    .string({ required_error: 'A search query is required.' })
    .trim()
    .min(1, 'A search query is required.')
    .max(40, 'Search query is too long.'),
});

export const quoteParamSchema = z.object({
  symbol: symbolSchema,
});

export type CreateHoldingInput = z.infer<typeof createHoldingSchema>;
export type UpdateHoldingInput = z.infer<typeof updateHoldingSchema>;
export type SearchSymbolsQuery = z.infer<typeof searchSymbolsSchema>;
