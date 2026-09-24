import { beforeEach, describe, expect, it } from 'vitest';
import { app, prisma, registerUser, request, resetDatabase } from './helpers';

beforeEach(resetDatabase);

const validPayload = {
  name: 'Sarah Wijaya',
  email: 'sarah@example.com',
  password: 'SuperSecret123',
  confirmPassword: 'SuperSecret123',
};

describe('POST /api/auth/register', () => {
  it('creates an account and returns the user without any password field', async () => {
    const response = await request(app).post('/api/auth/register').send(validPayload);

    expect(response.status).toBe(201);
    expect(response.body.data.user).toMatchObject({
      name: 'Sarah Wijaya',
      email: 'sarah@example.com',
      currency: 'IDR',
      onboardingCompleted: false,
    });
    expect(JSON.stringify(response.body)).not.toContain('password');
    expect(response.headers['set-cookie']?.[0]).toContain('financetrack_token=');
  });

  it('stores the password as a bcrypt hash, never plain text', async () => {
    await request(app).post('/api/auth/register').send(validPayload);

    const user = await prisma.user.findUnique({ where: { email: validPayload.email } });
    expect(user).not.toBeNull();
    expect(user!.passwordHash).not.toBe(validPayload.password);
    expect(user!.passwordHash).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('seeds the default income and expense categories', async () => {
    const response = await request(app).post('/api/auth/register').send(validPayload);
    const userId = response.body.data.user.id as string;

    const [income, expense] = await Promise.all([
      prisma.category.count({ where: { userId, type: 'INCOME' } }),
      prisma.category.count({ where: { userId, type: 'EXPENSE' } }),
    ]);

    expect(income).toBe(7);
    expect(expense).toBe(10);
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const response = await request(app).post('/api/auth/register').send(validPayload);

    expect(response.status).toBe(409);
    expect(response.body.error.message).toMatch(/already exists/i);
  });

  it.each([
    ['an invalid email', { ...validPayload, email: 'not-an-email' }, /valid email/i],
    ['a password under 8 characters', { ...validPayload, password: 'Short1', confirmPassword: 'Short1' }, /at least 8 characters/i],
    ['mismatched passwords', { ...validPayload, confirmPassword: 'Different123' }, /do not match/i],
    ['a missing name', { ...validPayload, name: '' }, /at least 2 characters/i],
  ])('rejects %s', async (_label, payload, expectedMessage) => {
    const response = await request(app).post('/api/auth/register').send(payload);

    expect(response.status).toBe(422);
    expect(response.body.error.message).toMatch(expectedMessage);
  });
});

describe('POST /api/auth/login', () => {
  it('signs in with correct credentials', async () => {
    const user = await registerUser({ password: 'SuperSecret123' });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'SuperSecret123' });

    expect(response.status).toBe(200);
    expect(response.body.data.user.id).toBe(user.id);
    expect(response.headers['set-cookie']?.[0]).toContain('HttpOnly');
  });

  it('returns the same generic message for a wrong password and an unknown email', async () => {
    const user = await registerUser({ password: 'SuperSecret123' });

    const wrongPassword = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'WrongPassword1' });
    const unknownEmail = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'WrongPassword1' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Identical response — no account-existence oracle (brief §5).
    expect(wrongPassword.body.error.message).toBe('Email atau password salah.');
    expect(unknownEmail.body.error.message).toBe('Email atau password salah.');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the auth cookie', async () => {
    const user = await registerUser();

    const response = await request(app).post('/api/auth/logout').set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.headers['set-cookie']?.[0]).toMatch(/financetrack_token=;/);
  });
});

describe('protected routes', () => {
  const protectedRoutes: [string, string][] = [
    ['get', '/api/dashboard'],
    ['get', '/api/transactions'],
    ['post', '/api/transactions'],
    ['get', '/api/budgets'],
    ['get', '/api/categories'],
    ['get', '/api/analytics'],
    ['get', '/api/profile'],
    ['get', '/api/auth/me'],
  ];

  it.each(protectedRoutes)('rejects unauthenticated %s %s', async (method, route) => {
    const response = await (request(app) as unknown as Record<string, (url: string) => request.Test>)[
      method
    ]!(route);

    expect(response.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const response = await request(app)
      .get('/api/dashboard')
      .set('Cookie', 'financetrack_token=not.a.real.token');

    expect(response.status).toBe(401);
  });

  it('accepts a valid session', async () => {
    const user = await registerUser();
    const response = await request(app).get('/api/auth/me').set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe(user.email);
  });
});

describe('onboarding', () => {
  it('stores the initial balance, currency and custom categories', async () => {
    const user = await registerUser();

    const response = await request(app)
      .post('/api/auth/onboarding')
      .set('Cookie', user.cookie)
      .send({
        initialBalance: 2_500_000,
        currency: 'IDR',
        monthlyIncomeTarget: 4_000_000,
        preferredCategories: ['Coffee', 'Food'],
      });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({
      initialBalance: 2_500_000,
      monthlyIncomeTarget: 4_000_000,
      onboardingCompleted: true,
    });

    // "Coffee" is new; "Food" already existed and must not be duplicated.
    expect(await prisma.category.count({ where: { userId: user.id, name: 'Coffee' } })).toBe(1);
    expect(await prisma.category.count({ where: { userId: user.id, name: 'Food' } })).toBe(1);
  });

  it('can be skipped', async () => {
    const user = await registerUser();

    const response = await request(app).post('/api/auth/onboarding/skip').set('Cookie', user.cookie);

    expect(response.status).toBe(200);
    expect(response.body.data.user.onboardingCompleted).toBe(true);
    expect(response.body.data.user.initialBalance).toBe(0);
  });
});

describe('profile', () => {
  it('updates the name and currency', async () => {
    const user = await registerUser();

    const response = await request(app)
      .put('/api/profile')
      .set('Cookie', user.cookie)
      .send({ name: 'Renamed User', currency: 'USD' });

    expect(response.status).toBe(200);
    expect(response.body.data.user).toMatchObject({ name: 'Renamed User', currency: 'USD' });
  });

  it('changes the password and invalidates the old one', async () => {
    const user = await registerUser({ password: 'SuperSecret123' });

    const change = await request(app)
      .put('/api/profile/password')
      .set('Cookie', user.cookie)
      .send({
        currentPassword: 'SuperSecret123',
        newPassword: 'BrandNewSecret456',
        confirmPassword: 'BrandNewSecret456',
      });
    expect(change.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'SuperSecret123' });
    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'BrandNewSecret456' });

    expect(oldLogin.status).toBe(401);
    expect(newLogin.status).toBe(200);
  });

  it('refuses a password change when the current password is wrong', async () => {
    const user = await registerUser({ password: 'SuperSecret123' });

    const response = await request(app)
      .put('/api/profile/password')
      .set('Cookie', user.cookie)
      .send({
        currentPassword: 'NotMyPassword1',
        newPassword: 'BrandNewSecret456',
        confirmPassword: 'BrandNewSecret456',
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toMatch(/current password is incorrect/i);
  });
});
