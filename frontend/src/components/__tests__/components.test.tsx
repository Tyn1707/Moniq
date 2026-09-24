import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionList } from '../transactions/TransactionList';
import { BudgetCard } from '../budgets/BudgetComponents';
import { SummaryCards } from '../dashboard/SummaryCards';
import { EmptyState, ErrorState } from '../ui/States';
import { ApiError } from '../../services/api';
import type { Budget, DashboardData, Transaction } from '../../types';

/**
 * Component behaviour that the brief calls out explicitly: income/expense signs,
 * budget status wording, and the empty/error states that must never be a blank
 * panel.
 */

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 't1',
  type: 'EXPENSE',
  amount: 35_000,
  description: 'Lunch at cafe',
  transactionDate: '2026-09-24T00:00:00.000Z',
  paymentMethod: 'CASH',
  notes: null,
  category: { id: 'c1', name: 'Food' },
  createdAt: '2026-09-24T00:00:00.000Z',
  ...overrides,
});

const budget = (overrides: Partial<Budget> = {}): Budget => ({
  id: 'b1',
  category: { id: 'c1', name: 'Food' },
  amount: 1_000_000,
  spent: 750_000,
  remaining: 250_000,
  usagePercentage: 75,
  status: 'WARNING',
  periodStart: '2026-09-01T00:00:00.000Z',
  periodEnd: '2026-09-30T23:59:59.999Z',
  transactionCount: 3,
  ...overrides,
});

describe('TransactionList', () => {
  it('shows expenses as negative and income as positive', () => {
    render(
      <TransactionList
        currency="IDR"
        transactions={[
          transaction({ id: 't1', type: 'EXPENSE', amount: 35_000, description: 'Lunch' }),
          transaction({
            id: 't2',
            type: 'INCOME',
            amount: 5_000_000,
            description: 'Salary',
            category: { id: 'c2', name: 'Salary' },
          }),
        ]}
      />,
    );

    // Rendered twice (mobile cards + desktop table), so use findAll-style queries.
    expect(screen.getAllByText(/−Rp\s?35\.000/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+Rp\s?5\.000\.000/).length).toBeGreaterThan(0);
  });

  it('renders a table with the columns from the brief', () => {
    render(<TransactionList currency="IDR" transactions={[transaction()]} />);

    expect(screen.getByRole('columnheader', { name: 'Date' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Category' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Amount' })).toBeInTheDocument();
  });

  it('hides edit and delete controls when read-only', () => {
    const onEdit = vi.fn();
    render(
      <TransactionList
        currency="IDR"
        transactions={[transaction()]}
        onEdit={onEdit}
        onDelete={vi.fn()}
        readOnly
      />,
    );

    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Delete/ })).not.toBeInTheDocument();
  });

  it('calls onDelete for the row that was clicked', async () => {
    const onDelete = vi.fn();
    render(
      <TransactionList
        currency="IDR"
        transactions={[transaction({ description: 'Bus fare' })]}
        onDelete={onDelete}
      />,
    );

    const [deleteButton] = screen.getAllByRole('button', { name: 'Delete Bus fare' });
    await userEvent.click(deleteButton!);

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0]?.[0]).toMatchObject({ description: 'Bus fare' });
  });
});

describe('BudgetCard', () => {
  it('shows the brief §16 example figures and a WARNING status', () => {
    render(
      <BudgetCard budget={budget()} currency="IDR" onEdit={vi.fn()} onDelete={vi.fn()} />,
    );

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/75% used/)).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?250\.000 left/)).toBeInTheDocument();
  });

  it('reports overspend rather than a negative "left" figure', () => {
    render(
      <BudgetCard
        budget={budget({
          amount: 1_000_000,
          spent: 1_200_000,
          remaining: -200_000,
          usagePercentage: 120,
          status: 'EXCEEDED',
        })}
        currency="IDR"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('Exceeded')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?200\.000 over budget/)).toBeInTheDocument();
  });

  it('clamps the progress bar at 100 while still reporting 120%', () => {
    render(
      <BudgetCard
        budget={budget({ usagePercentage: 120, status: 'EXCEEDED', remaining: -200_000 })}
        currency="IDR"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const progressBar = screen.getByRole('progressbar', { name: /Food budget usage/ });
    expect(progressBar).toHaveAttribute('aria-valuenow', '120');
    expect((progressBar.firstElementChild as HTMLElement).style.width).toBe('100%');
  });
});

describe('SummaryCards', () => {
  const summary: DashboardData['summary'] = {
    balance: 5_000_000,
    totalIncome: 5_000_000,
    totalExpense: 1_000_000,
    savings: 4_000_000,
    savingsRate: 80,
  };
  const currentMonth: DashboardData['currentMonth'] = {
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-09-30T23:59:59.999Z',
    income: 5_000_000,
    expense: 1_000_000,
    net: 4_000_000,
    savingsRate: 80,
  };

  it('renders the brief §39 scenario figures', () => {
    render(<SummaryCards summary={summary} currentMonth={currentMonth} currency="IDR" />);

    expect(screen.getByText('Current balance')).toBeInTheDocument();
    expect(screen.getAllByText(/Rp\s?5\.000\.000/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Rp\s?4\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/80% of your income saved/)).toBeInTheDocument();
  });

  it('explains a missing savings rate instead of showing a broken percentage', () => {
    render(
      <SummaryCards
        summary={{ ...summary, totalIncome: 0, savings: 0, savingsRate: null }}
        currentMonth={{ ...currentMonth, income: 0, savingsRate: null }}
        currency="IDR"
      />,
    );

    expect(screen.getByText(/Record income to see your savings rate/)).toBeInTheDocument();
  });
});

describe('EmptyState and ErrorState', () => {
  it('shows the empty message and its call to action', async () => {
    const onClick = vi.fn();
    render(
      <EmptyState
        title="No transactions yet."
        message="Add your first transaction."
        action={{ label: '+ Add your first transaction', onClick }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'No transactions yet.' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '+ Add your first transaction' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows the server message and never a stack trace', () => {
    render(
      <ErrorState
        error={new ApiError(500, 'Something went wrong. Please try again.', 'INTERNAL_ERROR')}
        onRetry={vi.fn()}
      />,
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong. Please try again.');
    expect(alert.textContent).not.toMatch(/\bat\s+\w+\s*\(/);
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('distinguishes a network failure', () => {
    render(<ErrorState error={new ApiError(0, 'Cannot reach the server.', 'NETWORK_ERROR')} />);

    expect(screen.getByRole('heading', { name: 'Cannot reach the server' })).toBeInTheDocument();
  });

  it('never leaks an unexpected Error message to the user', () => {
    render(<ErrorState error={new Error('TypeError: cannot read property of undefined')} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong. Please try again.');
    expect(alert.textContent).not.toContain('TypeError');
  });
});
