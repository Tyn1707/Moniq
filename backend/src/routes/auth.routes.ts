import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rate-limit';
import { validate } from '../middleware/validate';
import {
  loginSchema,
  onboardingSchema,
  registerSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout);

// Everything below requires a valid session.
router.get('/me', requireAuth, authController.me);
router.post('/onboarding', requireAuth, validate(onboardingSchema), authController.completeOnboarding);
router.post('/onboarding/skip', requireAuth, authController.skipOnboarding);

export default router;
