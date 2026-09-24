import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  addTransaction,
  app,
  findCategoryId,
  registerUser,
  request,
  resetDatabase,
  type TestUser,
} from './helpers';

/**
 * Authorization isolation (brief §23 / §24).
 *
 * User A must never be able to read, modify, or delete User B's data, even when
 * holding a valid session and the exact resource id.
 */

let alice: TestUser;
let bob: TestUser;
let aliceTransactionId: string;
let aliceBudgetId: string;
let aliceCategoryId: string;

beforeEach(async () => {
  await resetDatabase();

  alice = await registerUser({ name: 'Alice' });
  bob = await registerUser({ name: 'Bob' });

  const transaction = await addTransaction(alice, {
    type: 'EXPENSE',
    amount: 250_000,
    category: 'Food',
    description: 'Alice private lunch',
    date: new Date().toISOString().slice(0, 10),
  });
  aliceTransactionId = transaction.id;

  aliceCategoryId = await findCategoryId(alice.id, 'Food');

  const budget = await request(app)
    .post('/api/budgets')
    .set('Cookie', alice.cookie)
    .send({ categoryId: aliceCategoryId, amount: 1_000_000 });
  aliceBudgetId = budget.body.data.id as string;
});

describe('transaction isolation', () => {
  it("does not include another user's transactions in the list", async () => {
    const response = await request(app).get('/api/transactions').set('Cookie', bob.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.pagination.totalItems).toBe(0);
  });

  it("cannot read another user's transaction by id", async () => {
    const response = await request(app)
      .get(`/api/transactions/${aliceTransactionId}`)
      .set('Cookie', bob.cookie);

    expect(response.status).toBe(404);
  });

  it("cannot update another user's transaction", async () => {
    const response = await request(app)
      .put(`/api/transactions/${aliceTransactionId}`)
      .set('Cookie', bob.cookie)
      .send({ amount: 1 });

    expect(response.status).toBe(404);

    // Alice's record is untouched.
    const check = await request(app)
      .get(`/api/transactions/${aliceTransactionId}`)
      .set('Cookie', alice.cookie);
    expect(check.body.data.amount).toBe(250_000);
  });

  it("cannot delete another user's transaction", async () => {
    const response = await request(app)
      .delete(`/api/transactions/${aliceTransactionId}`)
      .set('Cookie', bob.cookie);

    expect(response.status).toBe(404);

    const check = await request(app)
      .get(`/api/transactions/${aliceTransactionId}`)
      .set('Cookie', alice.cookie);
    expect(check.status).toBe(200);
  });

  it("cannot file a transaction under another user's category", async () => {
    const response = await request(app)
      .post('/api/transactions')
      .set('Cookie', bob.cookie)
      .send({
        type: 'EXPENSE',
        amount: 10_000,
        categoryId: aliceCategoryId,
        description: 'Sneaky',
        transactionDate: '2026-09-24',
      });

    expect(response.status).toBe(404);
  });

  it("cannot search for another user's transaction text", async () => {
    const response = await request(app)
      .get('/api/transactions?search=private')
      .set('Cookie', bob.cookie);

    expect(response.body.data).toEqual([]);
  });
});

describe('budget isolation', () => {
  it("does not list another user's budgets", async () => {
    const response = await request(app).get('/api/budgets').set('Cookie', bob.cookie);

    expect(response.body.data).toEqual([]);
    expect(response.body.totals.budgeted).toBe(0);
  });

  it("cannot read, update or delete another user's budget", async () => {
    const read = await request(app).get(`/api/budgets/${aliceBudgetId}`).set('Cookie', bob.cookie);
    const update = await request(app)
      .put(`/api/budgets/${aliceBudgetId}`)
      .set('Cookie', bob.cookie)
      .send({ amount: 5 });
    const remove = await request(app)
      .delete(`/api/budgets/${aliceBudgetId}`)
      .set('Cookie', bob.cookie);

    expect(read.status).toBe(404);
    expect(update.status).toBe(404);
    expect(remove.status).toBe(404);
  });

  it("cannot budget against another user's category", async () => {
    const response = await request(app)
      .post('/api/budgets')
      .set('Cookie', bob.cookie)
      .send({ categoryId: aliceCategoryId, amount: 100_000 });

    expect(response.status).toBe(404);
  });
});

describe('category isolation', () => {
  it('only lists the requesting user\'s categories', async () => {
    await request(app)
      .post('/api/categories')
      .set('Cookie', alice.cookie)
      .send({ name: 'Alice Only', type: 'EXPENSE' })
      .expect(201);

    const response = await request(app).get('/api/categories').set('Cookie', bob.cookie);
    const names = response.body.data.map((category: { name: string }) => category.name);

    expect(names).not.toContain('Alice Only');
  });

  it("cannot rename or delete another user's category", async () => {
    const rename = await request(app)
      .put(`/api/categories/${aliceCategoryId}`)
      .set('Cookie', bob.cookie)
      .send({ name: 'Hijacked' });
    const remove = await request(app)
      .delete(`/api/categories/${aliceCategoryId}`)
      .set('Cookie', bob.cookie);

    expect(rename.status).toBe(404);
    expect(remove.status).toBe(404);
  });
});

describe('aggregate isolation', () => {
  it("keeps dashboard figures free of another user's data", async () => {
    const response = await request(app).get('/api/dashboard').set('Cookie', bob.cookie);

    expect(response.body.data.summary).toMatchObject({
      balance: 0,
      totalIncome: 0,
      totalExpense: 0,
      savings: 0,
    });
    expect(response.body.data.hasAnyTransactions).toBe(false);
  });

  it("keeps analytics figures free of another user's data", async () => {
    const response = await request(app)
      .get('/api/analytics?period=this_month')
      .set('Cookie', bob.cookie);

    expect(response.body.data.totals).toMatchObject({ income: 0, expense: 0, netCashFlow: 0 });
    expect(response.body.data.transactionCount).toBe(0);
  });

  it("never exposes another user's profile", async () => {
    const response = await request(app).get('/api/profile').set('Cookie', bob.cookie);

    expect(response.body.data.user.email).toBe(bob.email);
    expect(response.body.data.user.email).not.toBe(alice.email);
  });
});

describe('error responses', () => {
  beforeAll(() => {
    // Nothing to set up; grouped for readability.
  });

  it('never returns a stack trace or password hash', async () => {
    const response = await request(app)
      .get('/api/transactions/definitely-not-a-real-id')
      .set('Cookie', bob.cookie);

    const serialised = JSON.stringify(response.body);
    expect(serialised).not.toMatch(/at\s+\w+\s+\(/); // no stack frames
    expect(serialised).not.toContain('passwordHash');
    expect(serialised).not.toContain('$2a$');
  });

  it('returns a clean 404 for an unknown route', async () => {
    const response = await request(app).get('/api/not-a-route');

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects malformed JSON with a friendly message', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": broken}');

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/not valid JSON/i);
  });
});
