import type { Response } from 'express';
import { getDashboard } from '../services/dashboard.service';
import { getAnalytics } from '../services/analytics.service';
import { getBalanceHistoryForRange } from '../services/balance.service';
import { asyncHandler } from '../utils/async-handler';
import type { AuthenticatedRequest } from '../types/request';
import type { AnalyticsQuery } from '../validators/analytics.validator';
import type { ChartRangeQuery } from '../validators/history.validator';

export const dashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await getDashboard(req.user.id);
  res.json({ data });
});

export const analytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await getAnalytics(req.user.id, req.query as unknown as AnalyticsQuery);
  res.json({ data });
});

export const balanceHistory = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { range } = req.query as unknown as ChartRangeQuery;
  const data = await getBalanceHistoryForRange(req.user.id, range);
  res.json({ data });
});
