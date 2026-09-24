import type { Category } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/app-error';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type TransactionType,
} from '../utils/constants';
import type { CreateCategoryInput, ListCategoriesQuery } from '../validators/category.validator';

export interface CategoryDto {
  id: string;
  name: string;
  type: TransactionType;
  isDefault: boolean;
  transactionCount: number;
}

/**
 * Every category lookup goes through a `userId` filter. Categories are
 * per-user rather than global so that one user's custom category can never
 * appear in, or be edited from, another user's account (brief §23).
 */
export const findOwnedCategory = async (userId: string, categoryId: string): Promise<Category> => {
  const category = await prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) {
    // 404 rather than 403: we do not confirm that someone else's id exists.
    throw AppError.notFound('Category not found.');
  }
  return category;
};

/** Seed the default category set for a brand-new user (brief §10). */
export const createDefaultCategories = async (userId: string): Promise<void> => {
  const rows = [
    ...DEFAULT_INCOME_CATEGORIES.map((name) => ({ userId, name, type: 'INCOME', isDefault: true })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({ userId, name, type: 'EXPENSE', isDefault: true })),
  ];
  await prisma.category.createMany({ data: rows });
};

export const listCategories = async (
  userId: string,
  query: ListCategoriesQuery,
): Promise<CategoryDto[]> => {
  const categories = await prisma.category.findMany({
    where: { userId, ...(query.type === 'ALL' ? {} : { type: query.type }) },
    orderBy: [{ type: 'asc' }, { isDefault: 'desc' }, { name: 'asc' }],
    include: { _count: { select: { transactions: true } } },
  });

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    type: category.type as TransactionType,
    isDefault: category.isDefault,
    transactionCount: category._count.transactions,
  }));
};

export const createCategory = async (
  userId: string,
  input: CreateCategoryInput,
): Promise<CategoryDto> => {
  const existing = await prisma.category.findFirst({
    where: { userId, type: input.type, name: { equals: input.name } },
  });
  if (existing) {
    throw AppError.conflict(`You already have a ${input.type.toLowerCase()} category called "${input.name}".`);
  }

  const category = await prisma.category.create({
    data: { userId, name: input.name, type: input.type, isDefault: false },
  });

  return {
    id: category.id,
    name: category.name,
    type: category.type as TransactionType,
    isDefault: category.isDefault,
    transactionCount: 0,
  };
};

export const renameCategory = async (
  userId: string,
  categoryId: string,
  name: string,
): Promise<CategoryDto> => {
  const category = await findOwnedCategory(userId, categoryId);

  const duplicate = await prisma.category.findFirst({
    where: { userId, type: category.type, name, id: { not: categoryId } },
  });
  if (duplicate) {
    throw AppError.conflict(`You already have a category called "${name}".`);
  }

  const updated = await prisma.category.update({
    where: { id: categoryId },
    data: { name },
    include: { _count: { select: { transactions: true } } },
  });

  return {
    id: updated.id,
    name: updated.name,
    type: updated.type as TransactionType,
    isDefault: updated.isDefault,
    transactionCount: updated._count.transactions,
  };
};

export const deleteCategory = async (userId: string, categoryId: string): Promise<void> => {
  await findOwnedCategory(userId, categoryId);

  const transactionCount = await prisma.transaction.count({ where: { userId, categoryId } });
  if (transactionCount > 0) {
    // Deleting would either orphan or silently destroy transactions, both of
    // which would corrupt the balance. Refuse and explain instead.
    throw AppError.conflict(
      `This category is used by ${transactionCount} transaction(s). Reassign or delete them first.`,
    );
  }

  await prisma.category.delete({ where: { id: categoryId } });
};
