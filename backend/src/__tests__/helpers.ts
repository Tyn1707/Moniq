import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { prisma } from '../lib/prisma';

export const app: Express = createApp();

export interface TestUser {
  id: string;
  email: string;
  password: string;
  /** `Cookie` header value carrying the auth token. */
  cookie: string;
}

let userCounter = 0;

/** Remove every row, in FK-safe order. Called before each test. */
export const resetDatabase = async (): Promise<void> => {
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
};

export const extractCookie = (setCookie: string[] | string | undefined): string => {
  const headers = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const token = headers.find((header) => header.startsWith('financetrack_token='));
  if (!token) throw new Error('Auth cookie was not set on the response.');
  return token.split(';')[0] as string;
};

/** Register a fresh user and return their credentials plus session cookie. */
export const registerUser = async (overrides: Partial<{ name: string; email: string; password: string }> = {}): Promise<TestUser> => {
  userCounter += 1;
  const email = overrides.email ?? `user${userCounter}.${Date.now()}@example.com`;
  const password = overrides.password ?? 'SuperSecret123';
  const name = overrides.name ?? `Test User ${userCounter}`;

  const response = await request(app)
    .post('/api/auth/register')
    .send({ name, email, password, confirmPassword: password });

  if (response.status !== 201) {
    throw new Error(`Registration failed (${response.status}): ${JSON.stringify(response.body)}`);
  }

  return {
    id: response.body.data.user.id as string,
    email,
    password,
    cookie: extractCookie(response.headers['set-cookie']),
  };
};

/** Look up one of the user's seeded default categories by name. */
export const findCategoryId = async (userId: string, name: string): Promise<string> => {
  const category = await prisma.category.findFirst({ where: { userId, name } });
  if (!category) throw new Error(`Category "${name}" not found for user ${userId}.`);
  return category.id;
};

export interface AddTransactionOptions {
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  category: string;
  description?: string;
  date?: string;
  paymentMethod?: string;
}

/** Create a transaction through the HTTP API, so validation is exercised too. */
export const addTransaction = async (
  user: TestUser,
  options: AddTransactionOptions,
): Promise<{ id: string; body: Record<string, unknown> }> => {
  const categoryId = await findCategoryId(user.id, options.category);
  const response = await request(app)
    .post('/api/transactions')
    .set('Cookie', user.cookie)
    .send({
      type: options.type,
      amount: options.amount,
      categoryId,
      description: options.description ?? `${options.type} ${options.amount}`,
      transactionDate: options.date ?? '2026-09-24',
      ...(options.paymentMethod ? { paymentMethod: options.paymentMethod } : {}),
    });

  if (response.status !== 201) {
    throw new Error(`Transaction create failed (${response.status}): ${JSON.stringify(response.body)}`);
  }

  return { id: response.body.data.id as string, body: response.body.data };
};

export const getDashboard = async (user: TestUser) => {
  const response = await request(app).get('/api/dashboard').set('Cookie', user.cookie);
  if (response.status !== 200) {
    throw new Error(`Dashboard failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.data;
};

export { request, prisma };
