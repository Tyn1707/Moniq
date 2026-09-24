import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import { BUDGET_WARNING_THRESHOLD, type BudgetStatus } from '../utils/constants';
import {
  endOfUtcDay,
  endOfUtcMonth,
  startOfUtcDay,
  startOfUtcMonth,
  type DateRange,
} from '../utils/date';
import { ZERO, money, percentageOf, toNumber } from '../utils/money';
import { findOwnedCategory } from './category.service';
import type {
  CreateBudgetInput,
  ListBudgetsQuery,
  UpdateBudgetInput,
} from '../validators/budget.validator';

export interface BudgetDto {
  id: string;
  category: { id: string; name: string };
  amount: number;
  spent: number;
  /** Budget − spent. Negative once the budget is exceeded, which the UI shows as overspend. */
  remaining: number;
  /** Spent / budget × 100. Can exceed 100. */
  usagePercentage: number;
  status: BudgetStatus;
  periodStart: string;
  periodEnd: string;
  transactionCount: number;
}

/**
 * Budget status thresholds (brief §17).
 * EXCEEDED strictly requires spent > budget, so landing exactly on the budget
 * is "fully used" rather than "over".
 */
export const resolveBudgetStatus = (
  spent: Prisma.Decimal,
  amount: Prisma.Decimal,
): BudgetStatus => {
  if (spent.greaterThan(amount)) return 'EXCEEDED';
  const usage = percentageOf(spent, amount);
  if (usage !== null && usage >= BUDGET_WARNING_THRESHOLD) return 'WARNING';
  return 'SAFE';
};

/** `YYYY-MM` → the full calendar month range. Defaults to the current month. */
export const resolveMonthRange = (month?: string, now = new Date()): DateRange => {
  if (!month) {
    return { from: startOfUtcMonth(now), to: endOfUtcMonth(now) };
  }
  const [yearPart, monthPart] = month.split('-');
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  if (!Number.isInteger(year) || !Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    throw AppError.badRequest('Month must be in YYYY-MM format.');
  }
  const from = new Date(Date.UTC(year, monthIndex, 1));
  return { from, to: endOfUtcMonth(from) };
};

/**
 * Enrich budget rows with actual spending. Spending is summed from transactions
 * inside each budget's own period, never cached, so a budget always reflects the
 * current transaction set (brief §16).
 */
const withSpending = async (
  userId: string,
  budgets: (Prisma.BudgetGetPayload<{ include: { category: { select: { id: true; name: true } } } }>)[],
): Promise<BudgetDto[]> => {
  if (budgets.length === 0) return [];

  const spending = await Promise.all(
    budgets.map((budget) =>
      prisma.transaction.aggregate({
        where: {
          userId,
          categoryId: budget.categoryId,
          type: 'EXPENSE',
          transactionDate: { gte: budget.periodStart, lte: budget.periodEnd },
        },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ),
  );

  return budgets.map((budget, index) => {
    const aggregate = spending[index];
    const spent = money(aggregate?._sum.amount ?? ZERO);
    const amount = money(budget.amount);

    return {
      id: budget.id,
      category: { id: budget.category.id, name: budget.category.name },
      amount: toNumber(amount),
      spent: toNumber(spent),
      remaining: toNumber(amount.minus(spent)),
      usagePercentage: percentageOf(spent, amount) ?? 0,
      status: resolveBudgetStatus(spent, amount),
      periodStart: budget.periodStart.toISOString(),
      periodEnd: budget.periodEnd.toISOString(),
      transactionCount: aggregate?._count._all ?? 0,
    };
  });
};

export interface BudgetListResponse {
  period: { month: string; from: string; to: string };
  totals: { budgeted: number; spent: number; remaining: number; usagePercentage: number };
  items: BudgetDto[];
}

export const listBudgets = async (
  userId: string,
  query: ListBudgetsQuery,
  now = new Date(),
): Promise<BudgetListResponse> => {
  const range = resolveMonthRange(query.month, now);

  // Any budget that overlaps the selected month is relevant to it.
  const budgets = await prisma.budget.findMany({
    where: { userId, periodStart: { lte: range.to }, periodEnd: { gte: range.from } },
    orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
    include: { category: { select: { id: true, name: true } } },
  });

  const items = await withSpending(userId, budgets);

  const budgeted = items.reduce((acc, item) => acc.plus(item.amount), ZERO);
  const spent = items.reduce((acc, item) => acc.plus(item.spent), ZERO);

  return {
    period: {
      month: range.from.toISOString().slice(0, 7),
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
    totals: {
      budgeted: toNumber(budgeted),
      spent: toNumber(spent),
      remaining: toNumber(budgeted.minus(spent)),
      usagePercentage: percentageOf(spent, budgeted) ?? 0,
    },
    items,
  };
};

const loadOwnedBudget = async (userId: string, id: string) => {
  const budget = await prisma.budget.findFirst({
    where: { id, userId },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!budget) throw AppError.notFound('Budget not found.');
  return budget;
};

export const getBudget = async (userId: string, id: string): Promise<BudgetDto> => {
  const budget = await loadOwnedBudget(userId, id);
  const [dto] = await withSpending(userId, [budget]);
  if (!dto) throw AppError.notFound('Budget not found.');
  return dto;
};

export const createBudget = async (
  userId: string,
  input: CreateBudgetInput,
  now = new Date(),
): Promise<BudgetDto> => {
  const category = await findOwnedCategory(userId, input.categoryId);
  if (category.type !== 'EXPENSE') {
    throw AppError.badRequest('Budgets can only be set on expense categories.');
  }

  const periodStart = input.periodStart ? startOfUtcDay(input.periodStart) : startOfUtcMonth(now);
  const periodEnd = input.periodEnd ? endOfUtcDay(input.periodEnd) : endOfUtcMonth(periodStart);

  const duplicate = await prisma.budget.findFirst({
    where: { userId, categoryId: input.categoryId, periodStart },
  });
  if (duplicate) {
    throw AppError.conflict(`A budget for "${category.name}" already exists for that period.`);
  }

  const budget = await prisma.budget.create({
    data: {
      userId,
      categoryId: input.categoryId,
      amount: new Prisma.Decimal(input.amount),
      periodStart,
      periodEnd,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  const [dto] = await withSpending(userId, [budget]);
  return dto!;
};

export const updateBudget = async (
  userId: string,
  id: string,
  input: UpdateBudgetInput,
): Promise<BudgetDto> => {
  const existing = await loadOwnedBudget(userId, id);

  const periodStart = input.periodStart ? startOfUtcDay(input.periodStart) : existing.periodStart;
  const periodEnd = input.periodEnd ? endOfUtcDay(input.periodEnd) : existing.periodEnd;
  if (periodStart > periodEnd) {
    throw AppError.badRequest('Period end must be on or after period start.');
  }

  const updated = await prisma.budget.update({
    where: { id },
    data: {
      ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
      periodStart,
      periodEnd,
    },
    include: { category: { select: { id: true, name: true } } },
  });

  const [dto] = await withSpending(userId, [updated]);
  return dto!;
};

export const deleteBudget = async (userId: string, id: string): Promise<void> => {
  const result = await prisma.budget.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw AppError.notFound('Budget not found.');
};
