import { beforeEach, describe, expect, it } from 'vitest';
import {
  addTransaction,
  app,
  getDashboard,
  registerUser,
  request,
  resetDatabase,
  type TestUser,
} from './helpers';

beforeEach(resetDatabase);

/** Run onboarding so the user starts with a known initial balance. */
const withInitialBalance = async (amount: number): Promise<TestUser> => {
  const user = await registerUser();
  const response = await request(app)
    .post('/api/auth/onboarding')
    .set('Cookie', user.cookie)
    .send({ initialBalance: amount, currency: 'IDR', monthlyIncomeTarget: 0, preferredCategories: [] });

  expect(response.status).toBe(200);
  return user;
};

describe('balance calculation (brief §32)', () => {
  it('reproduces the sample scenario from brief §39', async () => {
    const user = await withInitialBalance(1_000_000);

    await addTransaction(user, { type: 'INCOME', amount: 5_000_000, category: 'Salary' });
    await addTransaction(user, { type: 'EXPENSE', amount: 500_000, category: 'Food' });
    await addTransaction(user, { type: 'EXPENSE', amount: 300_000, category: 'Transportation' });
    await addTransaction(user, { type: 'EXPENSE', amount: 200_000, category: 'Entertainment' });

    const dashboard = await getDashboard(user);

    expect(dashboard.summary).toMatchObject({
      totalIncome: 5_000_000,
      totalExpense: 1_000_000,
      // initialBalance 1,000,000 + income 5,000,000 − expense 1,000,000
      balance: 5_000_000,
      savings: 4_000_000,
    });
    // savings / income × 100 = 4,000,000 / 5,000,000 × 100
    expect(dashboard.summary.savingsRate).toBe(80);
  });

  it('increases the balance when income is added', async () => {
    const user = await withInitialBalance(0);
    const before = await getDashboard(user);

    await addTransaction(user, { type: 'INCOME', amount: 1_000_000, category: 'Salary' });
    const after = await getDashboard(user);

    expect(before.summary.balance).toBe(0);
    expect(after.summary.balance).toBe(1_000_000);
  });

  it('decreases the balance when an expense is added', async () => {
    const user = await withInitialBalance(1_000_000);

    await addTransaction(user, { type: 'EXPENSE', amount: 250_000, category: 'Food' });
    const dashboard = await getDashboard(user);

    expect(dashboard.summary.balance).toBe(750_000);
  });

  it('recalculates the balance correctly when an expense is edited (brief §13)', async () => {
    // Balance 1,000,000 with a 50,000 expense → 950,000.
    // Editing the expense to 75,000 must give 925,000, not 975,000.
    const user = await withInitialBalance(1_000_000);
    const { id } = await addTransaction(user, { type: 'EXPENSE', amount: 50_000, category: 'Food' });

    const beforeEdit = await getDashboard(user);
    expect(beforeEdit.summary.balance).toBe(950_000);

    await request(app)
      .put(`/api/transactions/${id}`)
      .set('Cookie', user.cookie)
      .send({ amount: 75_000 })
      .expect(200);

    const afterEdit = await getDashboard(user);
    expect(afterEdit.summary.balance).toBe(925_000);
    expect(afterEdit.summary.totalExpense).toBe(75_000);
  });

  it('recalculates correctly when an income is edited downwards', async () => {
    const user = await withInitialBalance(0);
    const { id } = await addTransaction(user, { type: 'INCOME', amount: 5_000_000, category: 'Salary' });

    await request(app)
      .put(`/api/transactions/${id}`)
      .set('Cookie', user.cookie)
      .send({ amount: 4_000_000 })
      .expect(200);

    const dashboard = await getDashboard(user);
    expect(dashboard.summary.totalIncome).toBe(4_000_000);
    expect(dashboard.summary.balance).toBe(4_000_000);
  });

  it('reverses the effect when an expense changes type to income', async () => {
    const user = await withInitialBalance(1_000_000);
    const { id } = await addTransaction(user, { type: 'EXPENSE', amount: 100_000, category: 'Food' });

    const salaryCategory = await request(app)
      .get('/api/categories?type=INCOME')
      .set('Cookie', user.cookie);
    const salaryId = salaryCategory.body.data.find((c: { name: string }) => c.name === 'Salary').id;

    await request(app)
      .put(`/api/transactions/${id}`)
      .set('Cookie', user.cookie)
      .send({ type: 'INCOME', categoryId: salaryId })
      .expect(200);

    const dashboard = await getDashboard(user);
    // The 100,000 expense is gone and is now income: 1,000,000 + 100,000.
    expect(dashboard.summary.totalExpense).toBe(0);
    expect(dashboard.summary.totalIncome).toBe(100_000);
    expect(dashboard.summary.balance).toBe(1_100_000);
  });

  it('restores the balance when an expense is deleted (brief §14)', async () => {
    const user = await withInitialBalance(1_000_000);
    const { id } = await addTransaction(user, { type: 'EXPENSE', amount: 100_000, category: 'Food' });

    expect((await getDashboard(user)).summary.balance).toBe(900_000);

    await request(app).delete(`/api/transactions/${id}`).set('Cookie', user.cookie).expect(200);

    expect((await getDashboard(user)).summary.balance).toBe(1_000_000);
  });

  it('reduces the balance when an income is deleted (brief §14)', async () => {
    const user = await withInitialBalance(0);
    const { id } = await addTransaction(user, { type: 'INCOME', amount: 1_000_000, category: 'Salary' });

    expect((await getDashboard(user)).summary.balance).toBe(1_000_000);

    await request(app).delete(`/api/transactions/${id}`).set('Cookie', user.cookie).expect(200);

    expect((await getDashboard(user)).summary.balance).toBe(0);
  });

  it('stays exact across many decimal amounts', async () => {
    const user = await withInitialBalance(0);
    await addTransaction(user, { type: 'INCOME', amount: 100, category: 'Salary' });
    for (let index = 0; index < 10; index += 1) {
      await addTransaction(user, { type: 'EXPENSE', amount: 0.1, category: 'Food' });
    }

    const dashboard = await getDashboard(user);
    // 0.1 summed ten times must be exactly 1, not 0.9999999999999999.
    expect(dashboard.summary.totalExpense).toBe(1);
    expect(dashboard.summary.balance).toBe(99);
  });

  it('follows the initial balance when it is edited in the profile', async () => {
    const user = await withInitialBalance(1_000_000);
    await addTransaction(user, { type: 'EXPENSE', amount: 100_000, category: 'Food' });

    await request(app)
      .put('/api/profile')
      .set('Cookie', user.cookie)
      .send({ initialBalance: 2_000_000 })
      .expect(200);

    expect((await getDashboard(user)).summary.balance).toBe(1_900_000);
  });
});

describe('dashboard content', () => {
  it('reports an empty state before any transaction exists', async () => {
    const user = await registerUser();
    const dashboard = await getDashboard(user);

    expect(dashboard.hasAnyTransactions).toBe(false);
    expect(dashboard.recentTransactions).toEqual([]);
    expect(dashboard.expenseByCategory).toEqual([]);
    expect(dashboard.summary.savingsRate).toBeNull();
  });

  it('breaks expense down by category with shares that total 100%', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    await addTransaction(user, { type: 'EXPENSE', amount: 700_000, category: 'Food', date: today });
    await addTransaction(user, { type: 'EXPENSE', amount: 200_000, category: 'Transportation', date: today });
    await addTransaction(user, { type: 'EXPENSE', amount: 100_000, category: 'Shopping', date: today });

    const dashboard = await getDashboard(user);
    const breakdown = dashboard.expenseByCategory as {
      categoryName: string;
      amount: number;
      percentage: number;
    }[];

    expect(breakdown.map((item) => item.categoryName)).toEqual(['Food', 'Transportation', 'Shopping']);
    expect(breakdown.map((item) => item.percentage)).toEqual([70, 20, 10]);
    expect(breakdown.reduce((total, item) => total + item.percentage, 0)).toBe(100);
  });

  it('returns a zero-filled six month income-vs-expense trend', async () => {
    const user = await registerUser();
    const dashboard = await getDashboard(user);

    expect(dashboard.monthlyTrend).toHaveLength(6);
    for (const point of dashboard.monthlyTrend) {
      expect(point).toMatchObject({ income: 0, expense: 0, net: 0 });
      expect(point.month).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it('lists recent transactions newest first, capped at eight', async () => {
    const user = await registerUser();
    for (let day = 1; day <= 10; day += 1) {
      await addTransaction(user, {
        type: 'EXPENSE',
        amount: day * 1_000,
        category: 'Food',
        description: `Expense ${day}`,
        date: `2026-09-${String(day).padStart(2, '0')}`,
      });
    }

    const dashboard = await getDashboard(user);

    expect(dashboard.recentTransactions).toHaveLength(8);
    expect(dashboard.recentTransactions[0].description).toBe('Expense 10');
  });
});
