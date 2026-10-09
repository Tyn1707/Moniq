import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import {
  MS_PER_DAY,
  countDaysInclusive,
  resolveChartRange,
  startOfUtcDay,
  toDayKey,
  type ChartRange,
  type DateRange,
} from '../utils/date';
import { type Money, ZERO, money, toNumber } from '../utils/money';

/**
 * Balance & totals — the authoritative financial arithmetic for the whole app.
 *
 * Design decision: the balance is **derived**, never stored. It is always
 * recomputed as `initialBalance + Σincome − Σexpense` straight from the
 * transaction rows (brief §32). A stored running balance would have to be
 * patched on every create/update/delete and would silently drift the first time
 * one of those patches was missed. Deriving it means "remove the old effect,
 * apply the new one" (brief §13) and the delete behaviour of §14 are correct by
 * construction rather than by careful bookkeeping.
 *
 * All of these calculations live on the server; the frontend only renders what
 * it is given (brief §40 rule 6).
 */

export interface Totals {
  income: Money;
  expense: Money;
}

const dateFilter = (range?: DateRange): Prisma.TransactionWhereInput =>
  range ? { transactionDate: { gte: range.from, lte: range.to } } : {};

/** Sum income and expense for a user, optionally restricted to a date range. */
export const getTotals = async (userId: string, range?: DateRange): Promise<Totals> => {
  const grouped = await prisma.transaction.groupBy({
    by: ['type'],
    where: { userId, ...dateFilter(range) },
    _sum: { amount: true },
  });

  const totals: Totals = { income: ZERO, expense: ZERO };
  for (const row of grouped) {
    const amount = row._sum.amount ?? ZERO;
    if (row.type === 'INCOME') totals.income = money(amount);
    else if (row.type === 'EXPENSE') totals.expense = money(amount);
  }
  return totals;
};

/** Net cash flow for a period: income − expense (brief §32). */
export const netCashFlow = (totals: Totals): Money => totals.income.minus(totals.expense);

/**
 * Current balance across the user's entire history.
 * `initialBalance` is the amount the user already had at onboarding.
 */
export const getCurrentBalance = async (userId: string): Promise<Money> => {
  const [user, totals] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { initialBalance: true } }),
    getTotals(userId),
  ]);

  const initialBalance = user ? money(user.initialBalance) : ZERO;
  return initialBalance.plus(totals.income).minus(totals.expense);
};

/** Total expense for one category within a period — used by budgets. */
export const getCategoryExpense = async (
  userId: string,
  categoryId: string,
  range: DateRange,
): Promise<Money> => {
  const result = await prisma.transaction.aggregate({
    where: { userId, categoryId, type: 'EXPENSE', ...dateFilter(range) },
    _sum: { amount: true },
  });
  return money(result._sum.amount ?? ZERO);
};

export interface BalancePoint {
  /** `YYYY-MM-DD`. */
  date: string;
  balance: number;
}

/**
 * Running balance per day across a date range (for the dashboard's balance line).
 *
 * The series is still *derived*, consistent with the "balance is never stored"
 * rule: we compute the opening balance as `initialBalance + Σ(everything before
 * the window)`, then walk the window day by day applying each day's net. Every
 * day in the range gets a point — including days with no activity, which simply
 * carry the previous balance forward — so the line never has misleading gaps.
 */
export const getBalanceHistory = async (
  userId: string,
  range: DateRange,
): Promise<BalancePoint[]> => {
  const [user, priorGrouped, windowRows] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { initialBalance: true } }),
    // Everything strictly before the window, to seed the opening balance.
    prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, transactionDate: { lt: range.from } },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: { userId, transactionDate: { gte: range.from, lte: range.to } },
      select: { type: true, amount: true, transactionDate: true },
      orderBy: { transactionDate: 'asc' },
    }),
  ]);

  let opening = user ? money(user.initialBalance) : ZERO;
  for (const row of priorGrouped) {
    const amount = money(row._sum.amount ?? ZERO);
    opening = row.type === 'INCOME' ? opening.plus(amount) : opening.minus(amount);
  }

  // Net movement per day inside the window.
  const dailyNet = new Map<string, Money>();
  for (const row of windowRows) {
    const key = toDayKey(row.transactionDate);
    const current = dailyNet.get(key) ?? ZERO;
    const amount = money(row.amount);
    dailyNet.set(key, row.type === 'INCOME' ? current.plus(amount) : current.minus(amount));
  }

  // Walk every day in the range so the line is continuous.
  const points: BalancePoint[] = [];
  let running = opening;
  const totalDays = countDaysInclusive(range.from, range.to);
  const cursor = startOfUtcDay(range.from);

  for (let dayIndex = 0; dayIndex < totalDays; dayIndex += 1) {
    const day = new Date(cursor.getTime() + dayIndex * MS_PER_DAY);
    const key = toDayKey(day);
    const net = dailyNet.get(key);
    if (net) running = running.plus(net);
    points.push({ date: key, balance: toNumber(running) });
  }

  return points;
};

export interface BalanceHistoryResponse {
  range: ChartRange;
  from: string;
  to: string;
  points: BalancePoint[];
}

/**
 * Balance history for a named chart range. For `ALL` the window is anchored to
 * the user's earliest transaction (falling back to account creation), so the
 * line starts where the data actually does rather than at an arbitrary epoch.
 * A hard day cap keeps very long `ALL` windows from producing an unbounded
 * series — a daily point for ~5+ years is still well within chart budget.
 */
const MAX_HISTORY_DAYS = 1900;

export const getBalanceHistoryForRange = async (
  userId: string,
  range: ChartRange,
  now = new Date(),
): Promise<BalanceHistoryResponse> => {
  let allFrom: Date | undefined;
  if (range === 'ALL') {
    const earliest = await prisma.transaction.findFirst({
      where: { userId },
      orderBy: { transactionDate: 'asc' },
      select: { transactionDate: true },
    });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    });
    allFrom = earliest?.transactionDate ?? user?.createdAt ?? now;
  }

  let window = resolveChartRange(range, now, allFrom);

  // Clamp an over-long window to the cap, keeping the most recent days.
  if (countDaysInclusive(window.from, window.to) > MAX_HISTORY_DAYS) {
    window = {
      from: new Date(startOfUtcDay(window.to).getTime() - (MAX_HISTORY_DAYS - 1) * MS_PER_DAY),
      to: window.to,
    };
  }

  const points = await getBalanceHistory(userId, window);
  return {
    range,
    from: window.from.toISOString(),
    to: window.to.toISOString(),
    points,
  };
};
