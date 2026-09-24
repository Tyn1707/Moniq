import rateLimit from 'express-rate-limit';
import { isTest } from '../config/env';

const disabled = isTest;

/** Generous ceiling for ordinary API traffic. */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => disabled,
  message: { error: { message: 'Too many requests. Please slow down.', code: 'RATE_LIMITED' } },
});

/** Tight limit on credential endpoints to blunt brute-force attempts. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skip: () => disabled,
  message: {
    error: {
      message: 'Too many sign-in attempts. Please try again in a few minutes.',
      code: 'RATE_LIMITED',
    },
  },
});
