import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatGroupedNumber,
  formatMonth,
  formatPercentage,
  formatRelativeDate,
  formatShortDate,
  formatTransactionAmount,
  parseGroupedNumber,
  toDateInputValue,
} from './format';

/**
 * These helpers decide how every figure in the app reads, so they are worth
 * pinning down: an IDR amount must never render with stray decimals, and a
 * transaction's sign must always match its type.
 */

describe('formatCurrency', () => {
  it('renders IDR without decimal places', () => {
    const formatted = formatCurrency(2_500_000, 'IDR');
    expect(formatted).toContain('2.500.000');
    expect(formatted).not.toContain(',00');
  });

  it('renders USD with two decimal places', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('marks negative amounts with a minus sign', () => {
    expect(formatCurrency(-50_000, 'IDR')).toMatch(/^−/);
  });

  it('keeps zero unsigned', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});

describe('formatTransactionAmount', () => {
  it('prefixes income with a plus', () => {
    expect(formatTransactionAmount(5_000_000, 'INCOME', 'IDR')).toMatch(/^\+/);
  });

  it('prefixes expense with a minus', () => {
    expect(formatTransactionAmount(35_000, 'EXPENSE', 'IDR')).toMatch(/^−/);
  });
});

describe('formatPercentage', () => {
  it('formats a number as a whole percentage', () => {
    expect(formatPercentage(75)).toBe('75%');
  });

  it('shows a dash when the value is not applicable', () => {
    // Savings rate is null when there was no income to divide by.
    expect(formatPercentage(null)).toBe('—');
  });

  it('supports fraction digits', () => {
    expect(formatPercentage(23.333, 2)).toBe('23.33%');
  });
});

describe('date formatting', () => {
  it('formats a short date in UTC', () => {
    expect(formatShortDate('2026-09-24T00:00:00.000Z')).toBe('24 Sep');
  });

  it('formats a month key', () => {
    expect(formatMonth('2026-09')).toBe('September 2026');
  });

  it('labels today and yesterday', () => {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString();
    const yesterday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1),
    ).toISOString();

    expect(formatRelativeDate(today)).toBe('Today');
    expect(formatRelativeDate(yesterday)).toBe('Yesterday');
  });

  it('produces a YYYY-MM-DD value for date inputs', () => {
    expect(toDateInputValue(new Date('2026-09-24T18:30:00.000Z'))).toBe('2026-09-24');
  });
});


describe('grouped number input helpers', () => {
  it('groups integers with dots as they grow past three digits', () => {
    expect(formatGroupedNumber('100000')).toBe('100.000');
    expect(formatGroupedNumber('10000000')).toBe('10.000.000');
    expect(formatGroupedNumber('999')).toBe('999');
  });

  it('shows the decimal mark as a comma while preserving in-progress input', () => {
    expect(formatGroupedNumber('1000.')).toBe('1.000,');
    expect(formatGroupedNumber('1000.5')).toBe('1.000,5');
  });

  it('passes through empty and lone-minus states untouched', () => {
    expect(formatGroupedNumber('')).toBe('');
    expect(formatGroupedNumber('-')).toBe('-');
  });

  it('parses a grouped display back to a raw machine number', () => {
    expect(parseGroupedNumber('10.000.000')).toBe('10000000');
    expect(parseGroupedNumber('1.000,5')).toBe('1000.5');
    expect(parseGroupedNumber('Rp 2.500.000')).toBe('2500000');
  });

  it('round-trips a raw value through format and parse', () => {
    expect(parseGroupedNumber(formatGroupedNumber('250000.75'))).toBe('250000.75');
  });
});
