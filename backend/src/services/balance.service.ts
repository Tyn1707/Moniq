import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { DateRange } from '../utils/date';
import { type Money, ZERO, money } from '../utils/money';

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
