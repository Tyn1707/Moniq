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

/** A date inside the current month, so it falls within a default budget period. */
const todayIso = (): string => new Date().toISOString().slice(0, 10);

const createBudget = async (user: TestUser, category: string, amount: number) => {
  const categoryId = await findCategoryId(user.id, category);
  const response = await request(app)
    .post('/api/budgets')
    .set('Cookie', user.cookie)
    .send({ categoryId, amount });

  if (response.status !== 201) {
    throw new Error(`Budget create failed (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body.data;
};

const listBudgets = async (user: TestUser) => {
  const response = await request(app).get('/api/budgets').set('Cookie', user.cookie);
  expect(response.status).toBe(200);
  return response.body;
};

describe('POST /api/budgets', () => {
  it('creates a budget defaulting to the current calendar month', async () => {
    const user = await registerUser();
    const budget = await createBudget(user, 'Food', 1_500_000);

    const now = new Date();
    expect(budget.amount).toBe(1_500_000);
    expect(budget.spent).toBe(0);
    expect(budget.remaining).toBe(1_500_000);
    expect(budget.status).toBe('SAFE');
    expect(budget.periodStart.slice(0, 7)).toBe(now.toISOString().slice(0, 7));
  });

  it('rejects a budget on an income category', async () => {
    const user = await registerUser();
    const salaryId = await findCategoryId(user.id, 'Salary');

    const response = await request(app)
      .post('/api/budgets')
      .set('Cookie', user.cookie)
      .send({ categoryId: salaryId, amount: 1_000_000 });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/only be set on expense categories/i);
  });

  it('rejects a duplicate budget for the same category and period', async () => {
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);
    const foodId = await findCategoryId(user.id, 'Food');

    const response = await request(app)
      .post('/api/budgets')
      .set('Cookie', user.cookie)
      .send({ categoryId: foodId, amount: 2_000_000 });

    expect(response.status).toBe(409);
  });

  it('rejects a zero or negative amount', async () => {
    const user = await registerUser();
    const foodId = await findCategoryId(user.id, 'Food');

    const response = await request(app)
      .post('/api/budgets')
      .set('Cookie', user.cookie)
      .send({ categoryId: foodId, amount: 0 });

    expect(response.status).toBe(422);
    expect(response.body.error.message).toMatch(/greater than 0/i);
  });
});

describe('budget calculation (brief §16)', () => {
  it('computes spent, remaining and usage from the brief example', async () => {
    // Budget 1,000,000 with 750,000 spent → remaining 250,000, usage 75%.
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);
    await addTransaction(user, { type: 'EXPENSE', amount: 750_000, category: 'Food', date: todayIso() });

    const [budget] = (await listBudgets(user)).data;

    expect(budget.spent).toBe(750_000);
    expect(budget.remaining).toBe(250_000);
    expect(budget.usagePercentage).toBe(75);
    expect(budget.status).toBe('WARNING');
  });

  it('only counts expenses in the budgeted category', async () => {
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);
    await addTransaction(user, { type: 'EXPENSE', amount: 200_000, category: 'Food', date: todayIso() });
    await addTransaction(user, { type: 'EXPENSE', amount: 500_000, category: 'Shopping', date: todayIso() });
    await addTransaction(user, { type: 'INCOME', amount: 900_000, category: 'Salary', date: todayIso() });

    const [budget] = (await listBudgets(user)).data;

    expect(budget.spent).toBe(200_000);
    expect(budget.transactionCount).toBe(1);
  });

  it('ignores expenses that fall outside the budget period', async () => {
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);
    // Well before the current month.
    await addTransaction(user, { type: 'EXPENSE', amount: 400_000, category: 'Food', date: '2020-01-15' });

    const [budget] = (await listBudgets(user)).data;

    expect(budget.spent).toBe(0);
    expect(budget.status).toBe('SAFE');
  });
});

describe('budget status thresholds (brief §17)', () => {
  it.each([
    ['SAFE well below the warning threshold', 100_000, 'SAFE', 10],
    ['SAFE just below the 75% threshold', 740_000, 'SAFE', 74],
    ['WARNING at exactly the 75% threshold (brief §17)', 750_000, 'WARNING', 75],
    ['WARNING at 99% usage', 990_000, 'WARNING', 99],
    ['WARNING, not EXCEEDED, at exactly 100% usage', 1_000_000, 'WARNING', 100],
  ])('reports %s', async (_label, spend, expectedStatus, expectedUsage) => {
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);
    await addTransaction(user, { type: 'EXPENSE', amount: spend, category: 'Food', date: todayIso() });

    const [budget] = (await listBudgets(user)).data;

    expect(budget.usagePercentage).toBe(expectedUsage);
    expect(budget.status).toBe(expectedStatus);
  });

  it('reports EXCEEDED and a negative remaining once spending passes the budget', async () => {
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);
    await addTransaction(user, { type: 'EXPENSE', amount: 1_200_000, category: 'Food', date: todayIso() });

    const [budget] = (await listBudgets(user)).data;

    expect(budget.status).toBe('EXCEEDED');
    expect(budget.spent).toBe(1_200_000);
    expect(budget.remaining).toBe(-200_000);
    expect(budget.usagePercentage).toBe(120);
  });
});

describe('GET /api/budgets', () => {
  it('returns an empty list and zeroed totals for a new user', async () => {
    const user = await registerUser();
    const body = await listBudgets(user);

    expect(body.data).toEqual([]);
    expect(body.totals).toMatchObject({ budgeted: 0, spent: 0, remaining: 0, usagePercentage: 0 });
  });

  it('aggregates totals across every budget', async () => {
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);
    await createBudget(user, 'Transportation', 500_000);
    await addTransaction(user, { type: 'EXPENSE', amount: 250_000, category: 'Food', date: todayIso() });
    await addTransaction(user, { type: 'EXPENSE', amount: 100_000, category: 'Transportation', date: todayIso() });

    const body = await listBudgets(user);

    expect(body.totals).toMatchObject({
      budgeted: 1_500_000,
      spent: 350_000,
      remaining: 1_150_000,
    });
    expect(body.totals.usagePercentage).toBeCloseTo(23.33, 1);
  });

  it('filters by month', async () => {
    const user = await registerUser();
    await createBudget(user, 'Food', 1_000_000);

    const response = await request(app)
      .get('/api/budgets?month=2020-01')
      .set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.period.month).toBe('2020-01');
  });
});

describe('PUT and DELETE /api/budgets/:id', () => {
  it('recomputes status after the amount is raised', async () => {
    const user = await registerUser();
    const budget = await createBudget(user, 'Food', 500_000);
    await addTransaction(user, { type: 'EXPENSE', amount: 600_000, category: 'Food', date: todayIso() });

    const before = (await listBudgets(user)).data[0];
    expect(before.status).toBe('EXCEEDED');

    const response = await request(app)
      .put(`/api/budgets/${budget.id}`)
      .set('Cookie', user.cookie)
      .send({ amount: 2_000_000 });

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('SAFE');
    expect(response.body.data.remaining).toBe(1_400_000);
  });

  it('deletes a budget', async () => {
    const user = await registerUser();
    const budget = await createBudget(user, 'Food', 500_000);

    const response = await request(app)
      .delete(`/api/budgets/${budget.id}`)
      .set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect((await listBudgets(user)).data).toEqual([]);
  });

  it('returns 404 for an unknown budget', async () => {
    const user = await registerUser();

    const response = await request(app).delete('/api/budgets/nope').set('Cookie', user.cookie);

    expect(response.status).toBe(404);
  });
});
