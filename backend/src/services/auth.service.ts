import bcrypt from 'bcryptjs';
import type { User } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { isTest } from '../config/env';
import { AppError } from '../utils/app-error';
import { toNumber } from '../utils/money';
import type { Currency } from '../utils/constants';
import { createDefaultCategories } from './category.service';
import type {
  ChangePasswordInput,
  LoginInput,
  OnboardingInput,
  RegisterInput,
  UpdateProfileInput,
} from '../validators/auth.validator';

/**
 * 12 rounds is the production work factor. The test suite drops to the bcrypt
 * minimum so that hashing does not dominate the runtime of hundreds of
 * registrations; this only ever applies when NODE_ENV=test.
 */
const BCRYPT_ROUNDS = isTest ? 4 : 12;

export interface UserDto {
  id: string;
  name: string;
  email: string;
  currency: Currency;
  initialBalance: number;
  monthlyIncomeTarget: number;
  onboardingCompleted: boolean;
  createdAt: string;
}

/**
 * Maps a User row to its API representation. `passwordHash` is structurally
 * impossible to leak through this function, which is why every endpoint returns
 * users through it (brief §24).
 */
export const toUserDto = (user: User): UserDto => ({
  id: user.id,
  name: user.name,
  email: user.email,
  currency: user.currency as Currency,
  initialBalance: toNumber(user.initialBalance),
  monthlyIncomeTarget: toNumber(user.monthlyIncomeTarget),
  onboardingCompleted: user.onboardingCompleted,
  createdAt: user.createdAt.toISOString(),
});

export const register = async (input: RegisterInput): Promise<UserDto> => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw AppError.conflict('An account with that email already exists.');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: { name: input.name, email: input.email, passwordHash },
  });

  // Give the new account a usable set of categories immediately, so the very
  // first "Add transaction" works without a detour through settings.
  await createDefaultCategories(user.id);

  return toUserDto(user);
};

export const login = async (input: LoginInput): Promise<UserDto> => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  // Compare against a dummy hash when the user is absent so that response time
  // does not reveal whether an email is registered, and return one identical
  // message for both failure modes (brief §5).
  const hashToCompare =
    user?.passwordHash ?? '$2a$12$0000000000000000000000000000000000000000000000000000';
  const passwordMatches = await bcrypt.compare(input.password, hashToCompare);

  if (!user || !passwordMatches) {
    throw AppError.unauthorized('Email atau password salah.');
  }

  return toUserDto(user);
};

export const getUserById = async (userId: string): Promise<UserDto> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();
  return toUserDto(user);
};

/**
 * Onboarding (brief §6). Preferred expense categories are additive: anything
 * the user types that they don't already have is created, and nothing is
 * deleted, so skipping onboarding still leaves a complete category set.
 */
export const completeOnboarding = async (
  userId: string,
  input: OnboardingInput,
): Promise<UserDto> => {
  if (input.preferredCategories.length > 0) {
    const existing = await prisma.category.findMany({
      where: { userId, type: 'EXPENSE' },
      select: { name: true },
    });
    const existingNames = new Set(existing.map((category) => category.name.toLowerCase()));

    const toCreate = [...new Set(input.preferredCategories)]
      .filter((name) => !existingNames.has(name.toLowerCase()))
      .map((name) => ({ userId, name, type: 'EXPENSE', isDefault: false }));

    if (toCreate.length > 0) {
      await prisma.category.createMany({ data: toCreate });
    }
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      initialBalance: input.initialBalance,
      currency: input.currency,
      monthlyIncomeTarget: input.monthlyIncomeTarget,
      onboardingCompleted: true,
    },
  });

  return toUserDto(user);
};

export const skipOnboarding = async (userId: string): Promise<UserDto> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { onboardingCompleted: true },
  });
  return toUserDto(user);
};

export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput,
): Promise<UserDto> => {
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.currency !== undefined && { currency: input.currency }),
      ...(input.initialBalance !== undefined && { initialBalance: input.initialBalance }),
      ...(input.monthlyIncomeTarget !== undefined && { monthlyIncomeTarget: input.monthlyIncomeTarget }),
    },
  });
  return toUserDto(user);
};

export const changePassword = async (
  userId: string,
  input: ChangePasswordInput,
): Promise<void> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw AppError.unauthorized();

  const matches = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!matches) {
    throw AppError.badRequest('Your current password is incorrect.');
  }

  const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
};
