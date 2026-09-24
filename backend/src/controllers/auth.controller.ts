import type { Request, Response } from 'express';
import * as authService from '../services/auth.service';
import { clearAuthCookie, setAuthCookie, signAuthToken } from '../middleware/auth';
import { asyncHandler } from '../utils/async-handler';
import type { AuthenticatedRequest } from '../types/request';
import type {
  ChangePasswordInput,
  LoginInput,
  OnboardingInput,
  RegisterInput,
  UpdateProfileInput,
} from '../validators/auth.validator';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.register(req.body as RegisterInput);
  setAuthCookie(res, signAuthToken({ id: user.id, email: user.email }));
  res.status(201).json({ data: { user } });
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.login(req.body as LoginInput);
  setAuthCookie(res, signAuthToken({ id: user.id, email: user.email }));
  res.json({ data: { user } });
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.json({ data: { message: 'Signed out successfully.' } });
});

export const me = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await authService.getUserById(req.user.id);
  res.json({ data: { user } });
});

export const completeOnboarding = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await authService.completeOnboarding(req.user.id, req.body as OnboardingInput);
  res.json({ data: { user } });
});

export const skipOnboarding = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await authService.skipOnboarding(req.user.id);
  res.json({ data: { user } });
});

export const getProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await authService.getUserById(req.user.id);
  res.json({ data: { user } });
});

export const updateProfile = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = await authService.updateProfile(req.user.id, req.body as UpdateProfileInput);
  res.json({ data: { user } });
});

export const changePassword = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  await authService.changePassword(req.user.id, req.body as ChangePasswordInput);
  res.json({ data: { message: 'Password updated successfully.' } });
});
