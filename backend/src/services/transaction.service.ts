import { Prisma, type Transaction } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import type { PaymentMethod, TransactionType } from '../utils/constants';
import {
  endOfUtcDay,
  endOfUtcMonth,
  startOfUtcDay,
  startOfUtcMonth,
  startOfUtcWeek,
} from '../utils/date';
import { toNumber } from '../utils/money';
import { findOwnedCategory } from './category.service';
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  UpdateTransactionInput,
} from '../validators/transaction.validator';

export interface TransactionDto {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  transactionDate: string;
  paymentMethod: PaymentMethod;
  notes: string | null;
  category: { id: string; name: string };
  createdAt: string;
}

export interface PaginatedTransactions {
  items: TransactionDto[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

type TransactionWithCategory = Transaction & { category: { id: string; name: string } };

export const toTransactionDto = (transaction: TransactionWithCategory): TransactionDto => ({
  id: transaction.id,
  type: transaction.type as TransactionType,
  amount: toNumber(transaction.amount),
  description: transaction.description,
  transactionDate: transaction.transactionDate.toISOString(),
  paymentMethod: transaction.paymentMethod as PaymentMethod,
  notes: transaction.notes,
  category: { id: transaction.category.id, name: transaction.category.name },
  createdAt: transaction.createdAt.toISOString(),
});

const buildSearchText = (description: string, notes?: string | null): string =>
  `${description} ${notes ?? ''}`.trim().toLowerCase();

/**
 * Resolve the date filter for a list query. Presets are evaluated server-side
 * so "this month" always means the same thing as the dashboard's "this month".
 */
const resolveDateFilter = (
  query: ListTransactionsQuery,
  now = new Date(),
): { gte: Date; lte: Date } | undefined => {
  switch (query.datePreset) {
    case 'today':
      return { gte: startOfUtcDay(now), lte: endOfUtcDay(now) };
    case 'this_week':
      return { gte: startOfUtcWeek(now), lte: endOfUtcDay(now) };
    case 'this_month':
      return { gte: startOfUtcMonth(now), lte: endOfUtcMonth(now) };
    case 'custom':
      // The validator guarantees both bounds are present for `custom`.
      return { gte: startOfUtcDay(query.dateFrom!), lte: endOfUtcDay(query.dateTo!) };
    case 'all':
    default:
      return undefined;
  }
};

const orderByFor = (sort: ListTransactionsQuery['sort']): Prisma.TransactionOrderByWithRelationInput[] => {
  switch (sort) {
    case 'oldest':
      return [{ transactionDate: 'asc' }, { createdAt: 'asc' }];
    case 'highest':
      return [{ amount: 'desc' }, { transactionDate: 'desc' }];
    case 'lowest':
      return [{ amount: 'asc' }, { transactionDate: 'desc' }];
    case 'newest':
    default:
      return [{ transactionDate: 'desc' }, { createdAt: 'desc' }];
  }
};

/**
 * `userId` is applied as a non-negotiable base filter here, not merged in from
 * caller-supplied input, so no query can ever reach another user's rows.
 */
export const buildTransactionWhere = (
  userId: string,
  query: ListTransactionsQuery,
): Prisma.TransactionWhereInput => {
  const where: Prisma.TransactionWhereInput = { userId };

  if (query.type !== 'ALL') where.type = query.type;
  if (query.categoryId && query.categoryId !== 'ALL') where.categoryId = query.categoryId;

  const dateFilter = resolveDateFilter(query);
  if (dateFilter) where.transactionDate = dateFilter;

  if (query.search) {
    where.searchText = { contains: query.search.toLowerCase() };
  }

  return where;
};

export const listTransactions = async (
  userId: string,
  query: ListTransactionsQuery,
): Promise<PaginatedTransactions> => {
  const where = buildTransactionWhere(userId, query);

  const [totalItems, rows] = await Promise.all([
    prisma.transaction.count({ where }),
    prisma.transaction.findMany({
      where,
      orderBy: orderByFor(query.sort),
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      include: { category: { select: { id: true, name: true } } },
    }),
  ]);

  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

  return {
    items: rows.map(toTransactionDto),
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages,
      hasNextPage: query.page < totalPages,
      hasPreviousPage: query.page > 1,
    },
  };
};

export const getTransaction = async (userId: string, id: string): Promise<TransactionDto> => {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: { select: { id: true, name: true } } },
  });
  if (!transaction) throw AppError.notFound('Transaction not found.');
  return toTransactionDto(transaction);
};

/**
 * A transaction's type must agree with its category's type — an "Income"
 * transaction filed under "Food" would corrupt every category breakdown.
 */
const assertCategoryMatchesType = async (
  userId: string,
  categoryId: string,
  type: TransactionType,
): Promise<void> => {
  const category = await findOwnedCategory(userId, categoryId);
  if (category.type !== type) {
    throw AppError.badRequest(
      `"${category.name}" is a ${category.type.toLowerCase()} category and cannot be used for a ${type.toLowerCase()} transaction.`,
    );
  }
};

export const createTransaction = async (
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionDto> => {
  await assertCategoryMatchesType(userId, input.categoryId, input.type);

  const transaction = await prisma.transaction.create({
    data: {
      userId,
      categoryId: input.categoryId,
      type: input.type,
      amount: new Prisma.Decimal(input.amount),
      description: input.description,
      transactionDate: startOfUtcDay(input.transactionDate),
      paymentMethod: input.paymentMethod,
      notes: input.notes ?? null,
      searchText: buildSearchText(input.description, input.notes),
    },
    include: { category: { select: { id: true, name: true } } },
  });

  return toTransactionDto(transaction);
};

/**
 * Update replaces the stored row wholesale. Because the balance is derived from
 * the rows (see balance.service), changing an expense from 50,000 to 75,000
 * automatically removes the old effect and applies the new one — there is no
 * delta arithmetic to get wrong (brief §13).
 */
export const updateTransaction = async (
  userId: string,
  id: string,
  input: UpdateTransactionInput,
): Promise<TransactionDto> => {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) throw AppError.notFound('Transaction not found.');

  const nextType = (input.type ?? existing.type) as TransactionType;
  const nextCategoryId = input.categoryId ?? existing.categoryId;
  await assertCategoryMatchesType(userId, nextCategoryId, nextType);

  const nextDescription = input.description ?? existing.description;
  const nextNotes = input.notes === undefined ? existing.notes : input.notes;

  const transaction = await prisma.transaction.update({
    where: { id },
    data: {
      type: nextType,
      categoryId: nextCategoryId,
      description: nextDescription,
      notes: nextNotes,
      searchText: buildSearchText(nextDescription, nextNotes),
      ...(input.amount !== undefined && { amount: new Prisma.Decimal(input.amount) }),
      ...(input.transactionDate !== undefined && {
        transactionDate: startOfUtcDay(input.transactionDate),
      }),
      ...(input.paymentMethod !== undefined && { paymentMethod: input.paymentMethod }),
    },
    include: { category: { select: { id: true, name: true } } },
  });

  return toTransactionDto(transaction);
};

export const deleteTransaction = async (userId: string, id: string): Promise<void> => {
  // deleteMany scoped by userId: a single statement that cannot delete another
  // user's row even if the id is guessed.
  const result = await prisma.transaction.deleteMany({ where: { id, userId } });
  if (result.count === 0) throw AppError.notFound('Transaction not found.');
};
