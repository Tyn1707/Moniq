import type { Response } from 'express';
import { getDashboard } from '../services/dashboard.service';
import { getAnalytics } from '../services/analytics.service';
import { asyncHandler } from '../utils/async-handler';
import type { AuthenticatedRequest } from '../types/request';
import type { AnalyticsQuery } from '../validators/analytics.validator';

export const dashboard = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await getDashboard(req.user.id);
  res.json({ data });
});

export const analytics = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const data = await getAnalytics(req.user.id, req.query as unknown as AnalyticsQuery);
  res.json({ data });
});
