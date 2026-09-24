import { beforeEach, describe, expect, it } from 'vitest';
import {
  addTransaction,
  app,
  findCategoryId,
  registerUser,
  request,
  resetDatabase,
  type TestUser,
} from './helpers';

beforeEach(resetDatabase);

interface Insight {
  id: string;
  tone: string;
  title: string;
  message: string;
}

const analytics = async (user: TestUser, query = 'period=this_month') => {
  const response = await request(app).get(`/api/analytics?${query}`).set('Cookie', user.cookie);
  if (response.status !== 200) {
    throw new Error(`Analytics failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.data;
};

const insightIds = (insights: Insight[]): string[] => insights.map((insight) => insight.id);

describe('GET /api/analytics', () => {
  it('reports net cash flow and savings rate for the period', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    await addTransaction(user, { type: 'INCOME', amount: 5_000_000, category: 'Salary', date: today });
    await addTransaction(user, { type: 'EXPENSE', amount: 2_000_000, category: 'Food', date: today });

    const data = await analytics(user);

    expect(data.totals).toMatchObject({
      income: 5_000_000,
      expense: 2_000_000,
      netCashFlow: 3_000_000,
      savingsRate: 60,
    });
  });

  it('computes average daily expense over every calendar day in the period', async () => {
    const user = await registerUser();
    await addTransaction(user, { type: 'EXPENSE', amount: 310_000, category: 'Food', date: '2026-01-10' });

    const data = await analytics(user, 'period=custom&from=2026-01-01&to=2026-01-31');

    expect(data.period.days).toBe(31);
    expect(data.averageDailyExpense).toBe(10_000);
  });

  it('identifies the highest expense category', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    await addTransaction(user, { type: 'EXPENSE', amount: 100_000, category: 'Transportation', date: today });
    await addTransaction(user, { type: 'EXPENSE', amount: 400_000, category: 'Food', date: today });

    const data = await analytics(user);

    expect(data.highestExpenseCategory).toMatchObject({
      categoryName: 'Food',
      amount: 400_000,
      percentage: 80,
    });
  });

  it('identifies the highest spending day', async () => {
    const user = await registerUser();
    await addTransaction(user, { type: 'EXPENSE', amount: 50_000, category: 'Food', date: '2026-01-05' });
    await addTransaction(user, { type: 'EXPENSE', amount: 90_000, category: 'Food', date: '2026-01-06' });
    await addTransaction(user, { type: 'EXPENSE', amount: 30_000, category: 'Food', date: '2026-01-06' });

    const data = await analytics(user, 'period=custom&from=2026-01-01&to=2026-01-31');

    // 6 Jan totals 120,000, beating 5 Jan's 50,000.
    expect(data.highestSpendingDay).toEqual({ date: '2026-01-06', amount: 120_000 });
  });

  it('returns a zero-filled daily trend covering the whole period', async () => {
    const user = await registerUser();

    const data = await analytics(user, 'period=custom&from=2026-03-01&to=2026-03-07');

    expect(data.dailyTrend).toHaveLength(7);
    expect(data.dailyTrend[0]).toEqual({ date: '2026-03-01', income: 0, expense: 0 });
    expect(data.dailyTrend[6].date).toBe('2026-03-07');
  });

  it('compares the period against the equivalent preceding period', async () => {
    const user = await registerUser();
    // 300,000 last month, 600,000 this month → +100%.
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15))
      .toISOString()
      .slice(0, 10);
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15))
      .toISOString()
      .slice(0, 10);

    await addTransaction(user, { type: 'EXPENSE', amount: 300_000, category: 'Food', date: lastMonth });
    await addTransaction(user, { type: 'EXPENSE', amount: 600_000, category: 'Food', date: thisMonth });

    const data = await analytics(user, 'period=this_month');

    expect(data.previousTotals.expense).toBe(300_000);
    expect(data.totals.expense).toBe(600_000);
    expect(data.comparison.expenseChange).toBe(100);
  });

  it('supports every named period', async () => {
    const user = await registerUser();

    for (const period of ['this_week', 'this_month', 'last_month', 'last_3_months']) {
      const data = await analytics(user, `period=${period}`);
      expect(data.period.key).toBe(period);
      expect(new Date(data.period.from).getTime()).toBeLessThanOrEqual(
        new Date(data.period.to).getTime(),
      );
    }
  });

  it('rejects a custom period without both bounds', async () => {
    const user = await registerUser();

    const response = await request(app)
      .get('/api/analytics?period=custom&from=2026-01-01')
      .set('Cookie', user.cookie);

    expect(response.status).toBe(422);
  });

  it('rejects an inverted custom range', async () => {
    const user = await registerUser();

    const response = await request(app)
      .get('/api/analytics?period=custom&from=2026-02-01&to=2026-01-01')
      .set('Cookie', user.cookie);

    expect(response.status).toBe(422);
    expect(response.body.error.message).toMatch(/on or after/i);
  });
});

describe('financial insights (brief §19)', () => {
  it('says there is no data instead of inventing insights', async () => {
    const user = await registerUser();

    const data = await analytics(user);

    expect(data.insights).toHaveLength(1);
    expect(data.insights[0]).toMatchObject({ id: 'no-data', tone: 'neutral' });
    expect(data.insights[0].message).toMatch(/no transactions recorded/i);
  });

  it('names the real largest expense category', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    await addTransaction(user, { type: 'EXPENSE', amount: 700_000, category: 'Food', date: today });
    await addTransaction(user, { type: 'EXPENSE', amount: 300_000, category: 'Shopping', date: today });

    const data = await analytics(user);
    const largest = (data.insights as Insight[]).find((insight) => insight.id === 'largest-category');

    expect(largest).toBeDefined();
    expect(largest!.message).toContain('Food');
    expect(largest!.message).toContain('70%');
  });

  it('reports the real savings rate', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    await addTransaction(user, { type: 'INCOME', amount: 1_000_000, category: 'Salary', date: today });
    await addTransaction(user, { type: 'EXPENSE', amount: 650_000, category: 'Food', date: today });

    const data = await analytics(user);
    const savings = (data.insights as Insight[]).find((insight) => insight.id === 'savings-rate');

    expect(savings).toBeDefined();
    expect(savings!.message).toContain('35%');
  });

  it('flags spending that exceeds income', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    await addTransaction(user, { type: 'INCOME', amount: 500_000, category: 'Salary', date: today });
    await addTransaction(user, { type: 'EXPENSE', amount: 900_000, category: 'Food', date: today });

    const data = await analytics(user);

    expect(insightIds(data.insights)).toContain('negative-cash-flow');
  });

  it('flags a rise in spending against the previous period', async () => {
    const user = await registerUser();
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15))
      .toISOString()
      .slice(0, 10);
    const lastMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 15))
      .toISOString()
      .slice(0, 10);

    await addTransaction(user, { type: 'EXPENSE', amount: 200_000, category: 'Food', date: lastMonth });
    await addTransaction(user, { type: 'EXPENSE', amount: 500_000, category: 'Food', date: thisMonth });

    const data = await analytics(user, 'period=this_month');
    const insight = (data.insights as Insight[]).find((item) => item.id === 'spending-up');

    expect(insight).toBeDefined();
    expect(insight!.message).toContain('150%');
  });

  it('warns about an exceeded budget', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    const foodId = await findCategoryId(user.id, 'Food');

    await request(app)
      .post('/api/budgets')
      .set('Cookie', user.cookie)
      .send({ categoryId: foodId, amount: 300_000 })
      .expect(201);
    await addTransaction(user, { type: 'EXPENSE', amount: 500_000, category: 'Food', date: today });

    const data = await analytics(user);
    const insight = (data.insights as Insight[]).find((item) =>
      item.id.startsWith('budget-exceeded-'),
    );

    expect(insight).toBeDefined();
    expect(insight!.tone).toBe('critical');
    expect(insight!.message).toMatch(/exceeded your Food budget/i);
  });

  it('warns about a budget approaching its limit', async () => {
    const user = await registerUser();
    const today = new Date().toISOString().slice(0, 10);
    const foodId = await findCategoryId(user.id, 'Food');

    await request(app)
      .post('/api/budgets')
      .set('Cookie', user.cookie)
      .send({ categoryId: foodId, amount: 1_000_000 })
      .expect(201);
    await addTransaction(user, { type: 'EXPENSE', amount: 850_000, category: 'Food', date: today });

    const data = await analytics(user);
    const insight = (data.insights as Insight[]).find((item) => item.id.startsWith('budget-warning-'));

    expect(insight).toBeDefined();
    expect(insight!.message).toContain('85%');
  });
});
