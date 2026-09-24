import type { Response } from 'express';
import * as categoryService from '../services/category.service';
import { asyncHandler } from '../utils/async-handler';
import type { AuthenticatedRequest } from '../types/request';
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from '../validators/category.validator';

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const categories = await categoryService.listCategories(
    req.user.id,
    req.query as unknown as ListCategoriesQuery,
  );
  res.json({ data: categories });
});

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const category = await categoryService.createCategory(req.user.id, req.body as CreateCategoryInput);
  res.status(201).json({ data: category, message: 'Category created successfully.' });
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { name } = req.body as UpdateCategoryInput;
  const category = await categoryService.renameCategory(req.user.id, req.params.id as string, name);
  res.json({ data: category, message: 'Category updated successfully.' });
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await categoryService.deleteCategory(req.user.id, req.params.id as string);
  res.json({ data: { id: req.params.id }, message: 'Category deleted successfully.' });
});
