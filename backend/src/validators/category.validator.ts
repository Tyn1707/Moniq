import { z } from 'zod';
import { TRANSACTION_TYPES } from '../utils/constants';
import { categoryNameSchema } from './common';

export const createCategorySchema = z.object({
  name: categoryNameSchema,
  type: z.enum(TRANSACTION_TYPES, {
    errorMap: () => ({ message: 'Category type must be either income or expense.' }),
  }),
});

export const updateCategorySchema = z.object({ name: categoryNameSchema });

export const listCategoriesSchema = z.object({
  type: z.enum(['ALL', ...TRANSACTION_TYPES]).default('ALL'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
export type ListCategoriesQuery = z.infer<typeof listCategoriesSchema>;
