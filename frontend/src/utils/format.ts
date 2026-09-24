import type { Currency, PaymentMethod, TransactionType } from '../types';

/**
 * Presentation helpers.
 *
 * These only ever *format* values the server already calculated. No financial
 * arithmetic happens on the client (brief §32/§40).
 */

const CURRENCY_LOCALES: Record<Currency, string> = {
  IDR: 'id-ID',
  USD: 'en-US',
  EUR: 'de-DE',
  SGD: 'en-SG',
  MYR: 'ms-MY',
  JPY: 'ja-JP',
  AUD: 'en-AU',
  GBP: 'en-GB',
};

/** Currencies conventionally written without minor units. */
const ZERO_DECIMAL_CURRENCIES: Currency[] = ['IDR', 'JPY'];

export const formatCurrency = (
  amount: number,
  currency: Currency = 'IDR',
  options: { compact?: boolean; signed?: boolean } = {},
): string => {
  const fractionDigits = ZERO_DECIMAL_CURRENCIES.includes(currency) ? 0 : 2;

  const formatted = new Intl.NumberFormat(CURRENCY_LOCALES[currency] ?? 'en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: options.compact ? 0 : fractionDigits,
    maximumFractionDigits: options.compact ? 1 : fractionDigits,
    notation: options.compact ? 'compact' : 'standard',
  }).format(Math.abs(amount));

  if (options.signed && amount !== 0) {
    return `${amount > 0 ? '+' : '−'}${formatted}`;
  }
  return amount < 0 ? `−${formatted}` : formatted;
};

/** Signed amount for a transaction row: income reads +, expense reads −. */
export const formatTransactionAmount = (
  amount: number,
  type: TransactionType,
  currency: Currency,
): string => {
  const formatted = formatCurrency(amount, currency);
  return type === 'INCOME' ? `+${formatted}` : `−${formatted}`;
};

export const formatPercentage = (value: number | null, fractionDigits = 0): string => {
  if (value === null || Number.isNaN(value)) return '—';
  return `${value.toFixed(fractionDigits)}%`;
};

/** Axis/tooltip labels need short numbers, not full currency strings. */
export const formatCompactNumber = (value: number): string =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

/**
 * Month names are spelled out rather than taken from `Intl`. ICU data differs
 * between runtimes — `en-GB` abbreviates September as "Sept" on some Node
 * builds and "Sep" on others — and a ledger's date column should not change
 * shape depending on the browser.
 */
const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/** `24 Sep 2026` */
export const formatDate = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

/** `24 Sep` */
export const formatShortDate = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getUTCDate()} ${MONTHS_SHORT[date.getUTCMonth()]}`;
};

/** `Today` / `Yesterday` / `24 Sep`, matching the brief's transaction list. */
export const formatRelativeDate = (iso: string): string => {
  const date = new Date(iso);
  const now = new Date();
  const dayStart = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const todayStart = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dayDifference = Math.round((todayStart - dayStart) / 86_400_000);

  if (dayDifference === 0) return 'Today';
  if (dayDifference === 1) return 'Yesterday';
  if (dayDifference === -1) return 'Tomorrow';
  return formatShortDate(iso);
};

/** `YYYY-MM-DD` in UTC, the format the API expects for date inputs. */
export const toDateInputValue = (date: Date = new Date()): string =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
    .toISOString()
    .slice(0, 10);

/** `September 2026` from a `YYYY-MM` key. */
export const formatMonth = (isoMonth: string): string => {
  const [year, month] = isoMonth.split('-');
  const monthIndex = Number(month) - 1;
  return `${MONTHS_LONG[monthIndex] ?? ''} ${year}`.trim();
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  DEBIT_CARD: 'Debit card',
  CREDIT_CARD: 'Credit card',
  BANK_TRANSFER: 'Bank transfer',
  E_WALLET: 'E-wallet',
  OTHER: 'Other',
};

export const CURRENCY_LABELS: Record<Currency, string> = {
  IDR: 'IDR — Indonesian rupiah',
  USD: 'USD — US dollar',
  EUR: 'EUR — Euro',
  SGD: 'SGD — Singapore dollar',
  MYR: 'MYR — Malaysian ringgit',
  JPY: 'JPY — Japanese yen',
  AUD: 'AUD — Australian dollar',
  GBP: 'GBP — Pound sterling',
};
