import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { analyticsQuerySchema } from '../validators/analytics.validator';
import * as insightsController from '../controllers/insights.controller';
import authRoutes from './auth.routes';
import budgetRoutes from './budget.routes';
import categoryRoutes from './category.routes';
import profileRoutes from './profile.routes';
import transactionRoutes from './transaction.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/auth', authRoutes);

/**
 * Every route below this line is authenticated. Applying `requireAuth` once at
 * the mount point — rather than per handler — means a newly added endpoint is
 * protected by default and cannot be forgotten (brief §24).
 */
router.use('/transactions', requireAuth, transactionRoutes);
router.use('/categories', requireAuth, categoryRoutes);
router.use('/budgets', requireAuth, budgetRoutes);
router.use('/profile', requireAuth, profileRoutes);
router.get('/dashboard', requireAuth, insightsController.dashboard);
router.get(
  '/analytics',
  requireAuth,
  validate(analyticsQuerySchema, 'query'),
  insightsController.analytics,
);

export default router;
