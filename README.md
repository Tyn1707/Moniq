# FinanceTrack

A personal finance tracker for students and young professionals.

> **Know where your money goes.**

Record income and expenses, group them by category, watch your balance, set
monthly budgets, and get insights derived from your own transactions.
FinanceTrack only ever *records and analyses* money — it never moves it.

---

## Stack

| Layer     | Choice                                                    |
| --------- | --------------------------------------------------------- |
| Frontend  | React 18 + TypeScript, Vite, Tailwind CSS, Recharts        |
| State     | TanStack Query (server state), React Hook Form + Zod       |
| Backend   | Node.js + Express + TypeScript                             |
| ORM       | Prisma                                                     |
| Database  | SQLite for local dev · PostgreSQL-ready (see below)        |
| Auth      | JWT in an httpOnly cookie, bcrypt password hashing         |
| Tests     | Vitest (+ Supertest for the API, Testing Library for UI)   |

### A note on the database

The brief recommends PostgreSQL. The machine this was built on had no Postgres
server and no Docker, so the local default is **SQLite** — it needs no
installation and lets the whole app run and be tested immediately.

The Prisma schema is written to be **provider-portable**: it avoids native enums
and `@db.*` native type attributes, and search is done against a pre-lowercased
column instead of Prisma's SQLite-incompatible `mode: 'insensitive'`. Moving to
PostgreSQL is therefore:

1. In `backend/prisma/schema.prisma`, change `provider = "sqlite"` to
   `provider = "postgresql"`.
2. Point `DATABASE_URL` at your Postgres instance.
3. Run `npm run prisma:migrate`.

No model or query changes are required.

---

## Getting started

Requires Node.js 20+ and npm.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Fill in `JWT_SECRET` in `.env` — the server refuses to boot without a secret of
at least 32 characters. Generate one with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then create the database and start the API:

```bash
npm run prisma:migrate     # creates the schema (and dev.db on SQLite)
npm run dev                # http://localhost:4000
```

Optional demo data reproducing the sample scenario from the brief:

```bash
npm run seed               # prints the generated demo password once
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                # http://localhost:5173
```

The Vite dev server proxies `/api` to the backend, which keeps the browser on a
single origin so the `SameSite=Strict` auth cookie works normally.

### 3. Tests

```bash
cd backend  && npm test    # 119 tests — API, balance, budgets, analytics, authorization
cd frontend && npm test    # 26 tests  — formatting and component behaviour
```

---

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma          # provider-portable data model
│   └── seed.ts                # dev-only demo data
└── src/
    ├── config/env.ts          # validated environment (fails fast)
    ├── lib/prisma.ts          # shared Prisma client
    ├── middleware/            # auth, validation, errors, rate limiting
    ├── validators/            # Zod schemas — the only input trust boundary
    ├── services/              # business logic (no HTTP knowledge)
    ├── controllers/           # HTTP in, JSON out
    ├── routes/                # routing + where requireAuth is applied
    ├── utils/                 # money, dates, errors, constants
    └── __tests__/             # Vitest + Supertest

frontend/src/
├── components/
│   ├── ui/                    # Button, Field, Modal, Skeleton, States…
│   ├── charts/                # Recharts wrappers
│   ├── layout/                # sidebar, bottom nav, topbar
│   ├── transactions/          # list, filters, form
│   ├── budgets/               # budget card + form
│   └── dashboard/             # summary cards, insights
├── pages/                     # one file per route
├── layouts/                   # AppLayout (guarded) + AuthLayout
├── hooks/                     # auth, toasts, data access
├── services/                  # API client + typed endpoints
├── types/                     # API contract types
└── utils/format.ts            # money/date/percentage presentation
```

---

## Key design decisions

**The balance is derived, never stored.** It is always recomputed as
`initialBalance + Σincome − Σexpense` directly from the transaction rows. A
stored running balance would need patching on every create, update and delete,
and would silently drift the first time a patch was missed. Deriving it makes
"remove the old effect, apply the new one" on edit, and the restore-on-delete
behaviour, correct by construction rather than by careful bookkeeping.

**Money is exact.** Amounts are stored as SQL `DECIMAL` and summed with Prisma's
`Decimal` (decimal.js), so adding thousands of transactions never accumulates
floating-point error. Conversion to a JSON `number` happens once, at the response
boundary.

**All financial arithmetic is server-side.** The frontend formats figures; it
never calculates them. The dashboard is a single request that returns every
number already computed.

**Authorization is structural, not incidental.** `requireAuth` is applied at
router mount points, so a newly added endpoint is protected by default. Every
query is scoped by `userId`, and single-row writes use `deleteMany`/`findFirst`
with a `userId` filter so a guessed id cannot reach another user's data.
Cross-user access returns `404`, not `403`, so the API never confirms that
someone else's record exists.

**Insights are evidence-based.** Each rule in `insight.service.ts` is a pure
function of aggregates computed from the user's own rows, and is skipped
entirely when its input is missing. There is no placeholder or sample text.

---

## Security

- Passwords hashed with bcrypt (12 rounds); plain text is never stored or logged.
- JWT held in an httpOnly, `SameSite=Strict` cookie — unreadable by JavaScript,
  and not attached to cross-site requests (CSRF defence).
- Login returns one identical message for an unknown email and a wrong password,
  and compares against a dummy hash when the user is absent so response timing
  does not reveal whether an account exists.
- All input validated with Zod before it reaches a service; the validated value
  replaces the raw request section so handlers cannot read unvalidated data.
- Prisma parameterises every query.
- Error responses carry a user-safe message only — no stack traces, no SQL, no
  internal identifiers. Unexpected errors are logged server-side.
- `helmet`, CORS allow-list, a JSON body size cap, and rate limiting (tighter on
  credential endpoints).
- Secrets come from environment variables. The server refuses to start without a
  `JWT_SECRET` of at least 32 characters, so there is no weak default to ship.

---

## API

All routes are prefixed with `/api`. Everything except register, login, logout
and health requires a valid session.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Sign in |
| `POST` | `/auth/logout` | Sign out |
| `GET` | `/auth/me` | Current user |
| `POST` | `/auth/onboarding` | Save starting balance, currency, categories |
| `POST` | `/auth/onboarding/skip` | Skip onboarding |
| `GET` | `/dashboard` | Summary, charts and recent activity in one call |
| `GET` `POST` | `/transactions` | List (search/filter/sort/paginate) · create |
| `GET` `PUT` `DELETE` | `/transactions/:id` | Read · update · delete |
| `GET` `POST` | `/categories` | List · create |
| `PUT` `DELETE` | `/categories/:id` | Rename · delete |
| `GET` `POST` | `/budgets` | List with spend · create |
| `GET` `PUT` `DELETE` | `/budgets/:id` | Read · update · delete |
| `GET` | `/analytics` | Period totals, trends and insights |
| `GET` `PUT` | `/profile` | Read · update |
| `PUT` | `/profile/password` | Change password |

---

## Business rules

| Figure | Formula |
| --- | --- |
| Current balance | `initialBalance + totalIncome − totalExpense` |
| Savings / net cash flow | `totalIncome − totalExpense` |
| Savings rate | `(income − expense) / income × 100` (null when income is 0) |
| Budget spent | Σ expenses in that category within the budget period |
| Budget usage | `spent / budget × 100` |
| Budget status | `EXCEEDED` when `spent > budget`; `WARNING` at ≥ 75% usage; otherwise `SAFE` |

The 75% warning threshold comes from the worked example in the brief: 750,000 of
a 1,000,000 budget is a warning.
