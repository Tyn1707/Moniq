/**
 * Development / demo seed.
 *
 * This data exists only to make local development and manual QA pleasant. It is
 * never required by the application at runtime — every figure the app displays
 * is computed from whatever rows are actually in the database (brief §40
 * rules 3–5).
 *
 * The fixture reproduces the sample scenario from brief §39 so the expected
 * numbers can be eyeballed in the UI:
 *   initial balance  1,000,000
 *   income   Salary        5,000,000
 *   expense  Food            500,000
 *   expense  Transportation  300,000
 *   expense  Entertainment   200,000
 *   => income 5,000,000 | expense 1,000,000 | balance 5,000,000 | savings 4,000,000
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
} from '../src/utils/constants';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@financetrack.local';

/** UTC midnight, `daysAgo` days before today. */
const daysAgo = (days: number): Date => {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};

const searchText = (description: string, notes?: string): string =>
  `${description} ${notes ?? ''}`.trim().toLowerCase();

const main = async (): Promise<void> => {
  // Never bake a credential into source. Use the provided password if the
  // developer set one, otherwise mint a random one and print it once.
  const password = process.env.SEED_USER_PASSWORD ?? crypto.randomBytes(9).toString('base64url');
  const generated = !process.env.SEED_USER_PASSWORD;

  // Idempotent: wipe and rebuild only the demo account.
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: DEMO_EMAIL,
      passwordHash: await bcrypt.hash(password, 12),
      currency: 'IDR',
      initialBalance: new Prisma.Decimal(1_000_000),
      monthlyIncomeTarget: new Prisma.Decimal(4_000_000),
      onboardingCompleted: true,
    },
  });

  await prisma.category.createMany({
    data: [
      ...DEFAULT_INCOME_CATEGORIES.map((name) => ({
        userId: user.id,
        name,
        type: 'INCOME',
        isDefault: true,
      })),
      ...DEFAULT_EXPENSE_CATEGORIES.map((name) => ({
        userId: user.id,
        name,
        type: 'EXPENSE',
        isDefault: true,
      })),
    ],
  });

  const categories = await prisma.category.findMany({ where: { userId: user.id } });
  const categoryId = (name: string): string => {
    const match = categories.find((category) => category.name === name);
    if (!match) throw new Error(`Seed category "${name}" is missing.`);
    return match.id;
  };

  const transactions: {
    type: 'INCOME' | 'EXPENSE';
    amount: number;
    category: string;
    description: string;
    date: Date;
    paymentMethod: string;
  }[] = [
    // --- brief §39 scenario -------------------------------------------------
    { type: 'INCOME', amount: 5_000_000, category: 'Salary', description: 'Monthly salary', date: daysAgo(3), paymentMethod: 'BANK_TRANSFER' },
    { type: 'EXPENSE', amount: 500_000, category: 'Food', description: 'Groceries and meals', date: daysAgo(2), paymentMethod: 'DEBIT_CARD' },
    { type: 'EXPENSE', amount: 300_000, category: 'Transportation', description: 'Commute top-up', date: daysAgo(1), paymentMethod: 'E_WALLET' },
    { type: 'EXPENSE', amount: 200_000, category: 'Entertainment', description: 'Cinema and streaming', date: daysAgo(1), paymentMethod: 'CREDIT_CARD' },
  ];

  await prisma.transaction.createMany({
    data: transactions.map((transaction) => ({
      userId: user.id,
      categoryId: categoryId(transaction.category),
      type: transaction.type,
      amount: new Prisma.Decimal(transaction.amount),
      description: transaction.description,
      transactionDate: transaction.date,
      paymentMethod: transaction.paymentMethod,
      searchText: searchText(transaction.description),
    })),
  });

  // A month-long budget set that exercises SAFE / WARNING / EXCEEDED.
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

  await prisma.budget.createMany({
    data: [
      { userId: user.id, categoryId: categoryId('Food'), amount: new Prisma.Decimal(1_500_000), periodStart, periodEnd },
      { userId: user.id, categoryId: categoryId('Transportation'), amount: new Prisma.Decimal(350_000), periodStart, periodEnd },
      { userId: user.id, categoryId: categoryId('Entertainment'), amount: new Prisma.Decimal(150_000), periodStart, periodEnd },
    ],
  });

  console.log('Seed complete.');
  console.log(`  email:    ${DEMO_EMAIL}`);
  if (generated) {
    console.log(`  password: ${password}   (generated — set SEED_USER_PASSWORD to choose your own)`);
  } else {
    console.log('  password: (from SEED_USER_PASSWORD)');
  }
};

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
