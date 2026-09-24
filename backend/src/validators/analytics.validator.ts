import { z } from 'zod';
import { ANALYTICS_PERIODS } from '../utils/constants';
import { dateSchema } from './common';

export const analyticsQuerySchema = z
  .object({
    period: z.enum(ANALYTICS_PERIODS).default('this_month'),
    from: dateSchema.optional(),
    to: dateSchema.optional(),
  })
  .refine((data) => data.period !== 'custom' || (data.from !== undefined && data.to !== undefined), {
    path: ['from'],
    message: 'A custom range needs both a start and end date.',
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    path: ['to'],
    message: 'End date must be on or after the start date.',
  });

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
