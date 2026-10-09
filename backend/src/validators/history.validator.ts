import { z } from 'zod';
import { CHART_RANGES } from '../utils/date';

/** Shared `?range=1W|1M|3M|1Y|ALL` query, defaulting to one month. */
export const chartRangeSchema = z.object({
  range: z.enum(CHART_RANGES).default('1M'),
});

export type ChartRangeQuery = z.infer<typeof chartRangeSchema>;
