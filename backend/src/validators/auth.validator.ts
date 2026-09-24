import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '../utils/constants';
import { categoryNameSchema, nonNegativeAmountSchema } from './common';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.');

const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required.')
  .max(254)
  .email('Please enter a valid email address.')
  .transform((value) => value.toLowerCase());

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters.')
      .max(80, 'Full name must be 80 characters or fewer.'),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required.'),
});

export const onboardingSchema = z.object({
  initialBalance: nonNegativeAmountSchema.default(0),
  currency: z.enum(SUPPORTED_CURRENCIES).default('IDR'),
  monthlyIncomeTarget: nonNegativeAmountSchema.default(0),
  /** Expense categories the user wants to keep; others stay available anyway. */
  preferredCategories: z.array(categoryNameSchema).max(30).default([]),
});

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(80).optional(),
    currency: z.enum(SUPPORTED_CURRENCIES).optional(),
    initialBalance: nonNegativeAmountSchema.optional(),
    monthlyIncomeTarget: nonNegativeAmountSchema.optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Provide at least one field to update.',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ['newPassword'],
    message: 'New password must be different from your current password.',
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
