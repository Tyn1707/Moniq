import { Prisma } from '@prisma/client';

/**
 * Money helpers.
 *
 * Amounts are persisted as SQL DECIMAL and manipulated with Prisma's Decimal
 * (decimal.js) so that summing thousands of transactions never accumulates
 * binary floating-point error. Values are only converted to `number` at the
 * JSON boundary, rounded to 2 decimal places.
 */

export type Money = Prisma.Decimal;

export const ZERO: Money = new Prisma.Decimal(0);

export const money = (value: Prisma.Decimal.Value): Money => new Prisma.Decimal(value);

export const sum = (values: Iterable<Prisma.Decimal.Value>): Money => {
  let total = ZERO;
  for (const value of values) {
    total = total.plus(value);
  }
  return total;
};

/** Serialise a monetary value for JSON output. */
export const toNumber = (value: Prisma.Decimal.Value | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  return new Prisma.Decimal(value).toDecimalPlaces(2).toNumber();
};

/**
 * Percentage helper that is explicit about the undefined `x / 0` case.
 * Returns `null` when the denominator is zero so callers must decide how to
 * present "not applicable" rather than silently showing 0% or Infinity.
 */
export const percentageOf = (
  part: Prisma.Decimal.Value,
  whole: Prisma.Decimal.Value,
): number | null => {
  const denominator = new Prisma.Decimal(whole);
  if (denominator.isZero()) return null;
  return new Prisma.Decimal(part).dividedBy(denominator).times(100).toDecimalPlaces(2).toNumber();
};
