import type { AnalyticsPeriod } from './constants';

/**
 * Date helpers.
 *
 * Transaction dates carry *date* semantics, not instant semantics: "lunch on
 * 24 Sep" must not drift to the 23rd or 25th depending on the viewer's
 * timezone. Every boundary below is therefore computed in UTC, and incoming
 * dates are normalised to UTC midnight before they are persisted.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Truncate to UTC midnight (inclusive lower bound of a day). */
export const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

/** Last representable instant of the UTC day (inclusive upper bound). */
export const endOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));

export const startOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));

export const endOfUtcMonth = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));

export const addUtcMonths = (date: Date, months: number): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));

/** Monday-based start of week, in UTC. */
export const startOfUtcWeek = (date: Date): Date => {
  const start = startOfUtcDay(date);
  const dayOfWeek = start.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dayOfWeek + 6) % 7;
  return new Date(start.getTime() - daysSinceMonday * MS_PER_DAY);
};

/** `YYYY-MM-DD` key, used to group transactions per day. */
export const toDayKey = (date: Date): string => date.toISOString().slice(0, 10);

/** `YYYY-MM` key, used to group transactions per month. */
export const toMonthKey = (date: Date): string => date.toISOString().slice(0, 7);

/** Inclusive count of days spanned by a range; always at least 1. */
export const countDaysInclusive = (from: Date, to: Date): number => {
  const days = Math.floor((startOfUtcDay(to).getTime() - startOfUtcDay(from).getTime()) / MS_PER_DAY) + 1;
  return Math.max(days, 1);
};

export interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Resolve a named analytics period (brief §18) into an inclusive date range.
 * `custom` requires explicit bounds, which the validator enforces.
 */
export const resolvePeriod = (
  period: AnalyticsPeriod,
  custom?: { from?: Date; to?: Date },
  now: Date = new Date(),
): DateRange => {
  switch (period) {
    case 'this_week':
      return { from: startOfUtcWeek(now), to: endOfUtcDay(now) };
    case 'this_month':
      return { from: startOfUtcMonth(now), to: endOfUtcMonth(now) };
    case 'last_month': {
      const lastMonth = addUtcMonths(startOfUtcMonth(now), -1);
      return { from: lastMonth, to: endOfUtcMonth(lastMonth) };
    }
    case 'last_3_months': {
      // Includes the current month, so: current month minus two.
      const from = addUtcMonths(startOfUtcMonth(now), -2);
      return { from, to: endOfUtcMonth(now) };
    }
    case 'custom': {
      if (!custom?.from || !custom?.to) {
        throw new Error('Custom period requires both a start and end date.');
      }
      return { from: startOfUtcDay(custom.from), to: endOfUtcDay(custom.to) };
    }
  }
};

/** The equivalent range immediately preceding `range`, for period comparisons. */
export const previousRange = (range: DateRange): DateRange => {
  const spanMs = range.to.getTime() - range.from.getTime();
  const to = new Date(range.from.getTime() - 1);
  return { from: new Date(range.from.getTime() - spanMs - 1), to };
};
