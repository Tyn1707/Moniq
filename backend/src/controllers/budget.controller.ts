import type { Response } from 'express';
import * as budgetService from '../services/budget.service';
import { asyncHandler } from '../utils/async-handler';
import type { AuthenticatedRequest } from '../types/request';
import type {
  CreateBudgetInput,
  ListBudgetsQuery,
  UpdateBudgetInput,
} from '../validators/budget.validator';

export const list = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const result = await budgetService.listBudgets(
    req.user.id,
    req.query as unknown as ListBudgetsQuery,
  );
  res.json({ data: result.items, period: result.period, totals: result.totals });
});

export const getOne = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const budget = await budgetService.getBudget(req.user.id, req.params.id as string);
  res.json({ data: budget });
});

export const create = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const budget = await budgetService.createBudget(req.user.id, req.body as CreateBudgetInput);
  res.status(201).json({ data: budget, message: 'Budget created successfully.' });
});

export const update = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const budget = await budgetService.updateBudget(
    req.user.id,
    req.params.id as string,
    req.body as UpdateBudgetInput,
  );
  res.json({ data: budget, message: 'Budget updated successfully.' });
});

export const remove = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await budgetService.deleteBudget(req.user.id, req.params.id as string);
  res.json({ data: { id: req.params.id }, message: 'Budget deleted successfully.' });
});
