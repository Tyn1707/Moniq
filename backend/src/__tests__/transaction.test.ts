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

describe('POST /api/transactions', () => {
  it('creates an income transaction', async () => {
    const user = await registerUser();
    const categoryId = await findCategoryId(user.id, 'Salary');

    const response = await request(app)
      .post('/api/transactions')
      .set('Cookie', user.cookie)
      .send({
        type: 'INCOME',
        amount: 5_000_000,
        categoryId,
        description: 'Salary',
        transactionDate: '2026-09-24',
        paymentMethod: 'BANK_TRANSFER',
      });

    expect(response.status).toBe(201);
    expect(response.body.message).toBe('Transaction added successfully.');
    expect(response.body.data).toMatchObject({
      type: 'INCOME',
      amount: 5_000_000,
      description: 'Salary',
      paymentMethod: 'BANK_TRANSFER',
      category: { id: categoryId, name: 'Salary' },
    });
  });

  it('creates an expense transaction and returns a numeric amount', async () => {
    const user = await registerUser();
    const { body } = await addTransaction(user, { type: 'EXPENSE', amount: 35_000, category: 'Food', description: 'Lunch' });

    expect(typeof body.amount).toBe('number');
    expect(body.amount).toBe(35_000);
  });

  it('accepts decimal amounts without floating point drift', async () => {
    const user = await registerUser();
    const { body } = await addTransaction(user, { type: 'EXPENSE', amount: 19.99, category: 'Food' });

    expect(body.amount).toBe(19.99);
  });

  it.each([
    ['a missing amount', { amount: undefined }, /amount is required|amount must be/i],
    ['a zero amount', { amount: 0 }, /greater than 0/i],
    ['a negative amount', { amount: -100 }, /greater than 0/i],
    ['an empty description', { description: '' }, /description is required/i],
    ['an invalid date', { transactionDate: 'yesterday' }, /valid date/i],
    ['an unknown type', { type: 'TRANSFER' }, /income or expense/i],
  ])('rejects %s', async (_label, patch, expectedMessage) => {
    const user = await registerUser();
    const categoryId = await findCategoryId(user.id, 'Food');

    const response = await request(app)
      .post('/api/transactions')
      .set('Cookie', user.cookie)
      .send({
        type: 'EXPENSE',
        amount: 10_000,
        categoryId,
        description: 'Test',
        transactionDate: '2026-09-24',
        ...patch,
      });

    expect(response.status).toBe(422);
    expect(response.body.error.message).toMatch(expectedMessage);
  });

  it('rejects a category that does not exist for the user', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/transactions')
      .set('Cookie', user.cookie)
      .send({
        type: 'EXPENSE',
        amount: 10_000,
        categoryId: 'does-not-exist',
        description: 'Test',
        transactionDate: '2026-09-24',
      });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toMatch(/category not found/i);
  });

  it('rejects an income transaction filed under an expense category', async () => {
    const user = await registerUser();
    const foodId = await findCategoryId(user.id, 'Food');

    const response = await request(app)
      .post('/api/transactions')
      .set('Cookie', user.cookie)
      .send({
        type: 'INCOME',
        amount: 10_000,
        categoryId: foodId,
        description: 'Wrong category',
        transactionDate: '2026-09-24',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/cannot be used for a income transaction/i);
  });
});

describe('GET /api/transactions', () => {
  const seed = async (user: TestUser): Promise<void> => {
    await addTransaction(user, { type: 'INCOME', amount: 5_000_000, category: 'Salary', description: 'Salary', date: '2026-09-24' });
    await addTransaction(user, { type: 'EXPENSE', amount: 35_000, category: 'Food', description: 'Lunch at cafe', date: '2026-09-24' });
    await addTransaction(user, { type: 'EXPENSE', amount: 20_000, category: 'Transportation', description: 'Bus fare', date: '2026-09-23' });
    await addTransaction(user, { type: 'EXPENSE', amount: 150_000, category: 'Shopping', description: 'New shirt', date: '2026-08-15' });
  };

  it('returns all transactions, newest first', async () => {
    const user = await registerUser();
    await seed(user);

    const response = await request(app).get('/api/transactions').set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.pagination.totalItems).toBe(4);
    const dates = response.body.data.map((item: { transactionDate: string }) => item.transactionDate);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it('sorts oldest first', async () => {
    const user = await registerUser();
    await seed(user);

    const response = await request(app)
      .get('/api/transactions?sort=oldest')
      .set('Cookie', user.cookie);

    expect(response.body.data[0].description).toBe('New shirt');
  });

  it('sorts by highest amount', async () => {
    const user = await registerUser();
    await seed(user);

    const response = await request(app)
      .get('/api/transactions?sort=highest')
      .set('Cookie', user.cookie);

    expect(response.body.data[0].amount).toBe(5_000_000);
  });

  it('filters by type', async () => {
    const user = await registerUser();
    await seed(user);

    const income = await request(app).get('/api/transactions?type=INCOME').set('Cookie', user.cookie);
    const expense = await request(app).get('/api/transactions?type=EXPENSE').set('Cookie', user.cookie);

    expect(income.body.pagination.totalItems).toBe(1);
    expect(expense.body.pagination.totalItems).toBe(3);
  });

  it('filters by category', async () => {
    const user = await registerUser();
    await seed(user);
    const foodId = await findCategoryId(user.id, 'Food');

    const response = await request(app)
      .get(`/api/transactions?categoryId=${foodId}`)
      .set('Cookie', user.cookie);

    expect(response.body.pagination.totalItems).toBe(1);
    expect(response.body.data[0].description).toBe('Lunch at cafe');
  });

  it('filters by a custom date range', async () => {
    const user = await registerUser();
    await seed(user);

    const response = await request(app)
      .get('/api/transactions?datePreset=custom&dateFrom=2026-09-01&dateTo=2026-09-30')
      .set('Cookie', user.cookie);

    expect(response.body.pagination.totalItems).toBe(3);
  });

  it('rejects a custom range that is missing a bound', async () => {
    const user = await registerUser();

    const response = await request(app)
      .get('/api/transactions?datePreset=custom&dateFrom=2026-09-01')
      .set('Cookie', user.cookie);

    expect(response.status).toBe(422);
  });

  it('searches descriptions case-insensitively', async () => {
    const user = await registerUser();
    await seed(user);

    const response = await request(app)
      .get('/api/transactions?search=LUNCH')
      .set('Cookie', user.cookie);

    expect(response.body.pagination.totalItems).toBe(1);
    expect(response.body.data[0].description).toBe('Lunch at cafe');
  });

  it('paginates and reports page metadata', async () => {
    const user = await registerUser();
    await seed(user);

    const page1 = await request(app)
      .get('/api/transactions?page=1&pageSize=3')
      .set('Cookie', user.cookie);
    const page2 = await request(app)
      .get('/api/transactions?page=2&pageSize=3')
      .set('Cookie', user.cookie);

    expect(page1.body.data).toHaveLength(3);
    expect(page1.body.pagination).toMatchObject({
      page: 1,
      totalPages: 2,
      totalItems: 4,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(page2.body.data).toHaveLength(1);
    expect(page2.body.pagination).toMatchObject({ hasNextPage: false, hasPreviousPage: true });
  });
});

describe('PUT /api/transactions/:id', () => {
  it('updates the amount and description', async () => {
    const user = await registerUser();
    const { id } = await addTransaction(user, { type: 'EXPENSE', amount: 50_000, category: 'Food', description: 'Lunch' });

    const response = await request(app)
      .put(`/api/transactions/${id}`)
      .set('Cookie', user.cookie)
      .send({ amount: 75_000, description: 'Lunch and coffee' });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Transaction updated successfully.');
    expect(response.body.data).toMatchObject({ amount: 75_000, description: 'Lunch and coffee' });
  });

  it('can switch an expense into an income with a matching category', async () => {
    const user = await registerUser();
    const { id } = await addTransaction(user, { type: 'EXPENSE', amount: 50_000, category: 'Food' });
    const salaryId = await findCategoryId(user.id, 'Salary');

    const response = await request(app)
      .put(`/api/transactions/${id}`)
      .set('Cookie', user.cookie)
      .send({ type: 'INCOME', categoryId: salaryId });

    expect(response.status).toBe(200);
    expect(response.body.data.type).toBe('INCOME');
  });

  it('returns 404 for an unknown id', async () => {
    const user = await registerUser();

    const response = await request(app)
      .put('/api/transactions/unknown-id')
      .set('Cookie', user.cookie)
      .send({ amount: 1_000 });

    expect(response.status).toBe(404);
  });
});

describe('DELETE /api/transactions/:id', () => {
  it('deletes the transaction', async () => {
    const user = await registerUser();
    const { id } = await addTransaction(user, { type: 'EXPENSE', amount: 50_000, category: 'Food' });

    const response = await request(app)
      .delete(`/api/transactions/${id}`)
      .set('Cookie', user.cookie);
    const after = await request(app).get(`/api/transactions/${id}`).set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Transaction deleted successfully.');
    expect(after.status).toBe(404);
  });
});

describe('categories', () => {
  it('creates a custom category', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/categories')
      .set('Cookie', user.cookie)
      .send({ name: 'Pet Care', type: 'EXPENSE' });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ name: 'Pet Care', type: 'EXPENSE', isDefault: false });
  });

  it('rejects a duplicate category name for the same type', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/categories')
      .set('Cookie', user.cookie)
      .send({ name: 'Food', type: 'EXPENSE' });

    expect(response.status).toBe(409);
  });

  it('refuses to delete a category that still has transactions', async () => {
    const user = await registerUser();
    await addTransaction(user, { type: 'EXPENSE', amount: 10_000, category: 'Food' });
    const foodId = await findCategoryId(user.id, 'Food');

    const response = await request(app)
      .delete(`/api/categories/${foodId}`)
      .set('Cookie', user.cookie);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/used by 1 transaction/i);
  });
});
