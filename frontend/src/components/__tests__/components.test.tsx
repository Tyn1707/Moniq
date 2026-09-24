import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TransactionList } from '../transactions/TransactionList';
import { BudgetCard } from '../budgets/BudgetComponents';
import { BalanceHero, SummaryTiles } from '../dashboard/SummaryCards';
import { InsightList } from '../dashboard/InsightList';
import { EmptyState, ErrorState } from '../ui/States';
import { RingProgress, SegmentedControl } from '../ui';
import { ApiError } from '../../services/api';
import type { Budget, DashboardData, Insight, MonthlyTrendPoint, Transaction } from '../../types';

/**
 * Component behaviour the brief calls out explicitly: income/expense signs, budget
 * status wording and thresholds, and the empty/error states that must never be a
 * blank panel.
 *
 * Note on animation: `AnimatedCurrency` counts up via `useCountUp`, which reports
 * the final value immediately when `matchMedia` is unavailable — as it is in jsdom.
 * These assertions therefore see real figures, not zeros, which is exactly the
 * guarantee the hook is meant to provide.
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

    expect(screen.getByText(/−Rp\s?35\.000/)).toBeInTheDocument();
    expect(screen.getByText(/\+Rp\s?5\.000\.000/)).toBeInTheDocument();
  });

  it('renders each transaction with its description, category and date', () => {
    render(<TransactionList currency="IDR" transactions={[transaction()]} />);

    expect(screen.getByText('Lunch at cafe')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('24 Sep')).toBeInTheDocument();
    expect(screen.getByText('Cash')).toBeInTheDocument();
  });

  it('hides edit and delete controls when read-only', () => {
    render(
      <TransactionList
        currency="IDR"
        transactions={[transaction()]}
        onEdit={vi.fn()}
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

    await userEvent.click(screen.getByRole('button', { name: 'Delete Bus fare' }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0]?.[0]).toMatchObject({ description: 'Bus fare' });
  });

  it('groups rows by day and shows a net total per day when grouping is on', () => {
    // Fixed dates well away from "today", so the labels are absolute (“24 Mar”)
    // rather than relative (“Today”), and the per-day nets are distinct from every
    // individual row amount so each assertion matches exactly one element.
    render(
      <TransactionList
        currency="IDR"
        groupByDate
        transactions={[
          transaction({ id: 'a', type: 'INCOME', amount: 500_000, transactionDate: '2026-03-24T00:00:00.000Z', category: { id: 'c2', name: 'Salary' } }),
          transaction({ id: 'b', type: 'EXPENSE', amount: 200_000, transactionDate: '2026-03-24T00:00:00.000Z' }),
          transaction({ id: 'c', type: 'EXPENSE', amount: 50_000, transactionDate: '2026-03-23T00:00:00.000Z' }),
          transaction({ id: 'd', type: 'EXPENSE', amount: 25_000, transactionDate: '2026-03-23T00:00:00.000Z' }),
        ]}
      />,
    );

    const headings = screen.getAllByRole('heading', { level: 3 });
    expect(headings).toHaveLength(2);
    expect(headings[0]).toHaveTextContent('24 Mar');
    expect(headings[1]).toHaveTextContent('23 Mar');

    // 24 Mar nets +500,000 − 200,000 = +300,000; 23 Mar nets −75,000.
    expect(within(headings[0]!).getByText(/\+Rp\s?300\.000/)).toBeInTheDocument();
    expect(within(headings[1]!).getByText(/−Rp\s?75\.000/)).toBeInTheDocument();
  });

  it('does not reorder transactions when grouping, preserving the chosen sort', () => {
    render(
      <TransactionList
        currency="IDR"
        groupByDate
        transactions={[
          transaction({ id: 'old', description: 'Older', transactionDate: '2026-03-20T00:00:00.000Z' }),
          transaction({ id: 'new', description: 'Newer', transactionDate: '2026-03-24T00:00:00.000Z' }),
        ]}
      />,
    );

    const headings = screen.getAllByRole('heading', { level: 3 });
    // Server returned oldest first, so the first group must still be the older day.
    expect(headings[0]).toHaveTextContent('20 Mar');
    expect(headings[1]).toHaveTextContent('24 Mar');
  });
});

describe('BudgetCard', () => {
  it('shows the brief §16 example figures and a WARNING status', () => {
    render(<BudgetCard budget={budget()} currency="IDR" onEdit={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?750\.000 of Rp\s?1\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText('Warning')).toBeInTheDocument();
    expect(screen.getByText(/Rp\s?250\.000 left/)).toBeInTheDocument();

    const ring = screen.getByRole('progressbar', { name: 'Food budget usage' });
    expect(ring).toHaveAttribute('aria-valuenow', '75');
    expect(within(ring).getByText('75%')).toBeInTheDocument();
  });

  it('reports overspend rather than a negative "left" figure', () => {
    render(
      <BudgetCard
        budget={budget({
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
    expect(screen.queryByText(/−Rp\s?200\.000 left/)).not.toBeInTheDocument();
  });

  it('reports the true percentage above 100 while the ring itself is full', () => {
    render(
      <BudgetCard
        budget={budget({ usagePercentage: 120, status: 'EXCEEDED', remaining: -200_000 })}
        currency="IDR"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const ring = screen.getByRole('progressbar', { name: 'Food budget usage' });
    expect(ring).toHaveAttribute('aria-valuenow', '120');
    expect(within(ring).getByText('120%')).toBeInTheDocument();

    // A full ring means zero remaining dash offset — the gauge cannot overfill.
    const arc = ring.querySelectorAll('circle')[1] as SVGCircleElement;
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBe(0);
  });

  it('exposes edit and delete actions for the right budget', async () => {
    const onEdit = vi.fn();
    render(
      <BudgetCard
        budget={budget({ category: { id: 'c9', name: 'Transport' } })}
        currency="IDR"
        onEdit={onEdit}
        onDelete={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Edit Transport budget' }));
    expect(onEdit).toHaveBeenCalledOnce();
  });
});

describe('RingProgress', () => {
  it('leaves a partial arc for a partial value', () => {
    render(<RingProgress value={50} status="SAFE" label="Usage" />);

    const ring = screen.getByRole('progressbar', { name: 'Usage' });
    const arc = ring.querySelectorAll('circle')[1] as SVGCircleElement;
    const circumference = Number(arc.getAttribute('stroke-dasharray'));
    const offset = Number(arc.getAttribute('stroke-dashoffset'));

    expect(offset).toBeGreaterThan(0);
    expect(offset).toBeLessThan(circumference);
    expect(offset).toBeCloseTo(circumference / 2, 5);
  });

  it('clamps a negative value to an empty ring', () => {
    render(<RingProgress value={-20} status="SAFE" label="Usage" />);

    const ring = screen.getByRole('progressbar', { name: 'Usage' });
    const arc = ring.querySelectorAll('circle')[1] as SVGCircleElement;
    expect(Number(arc.getAttribute('stroke-dashoffset'))).toBeCloseTo(
      Number(arc.getAttribute('stroke-dasharray')),
      5,
    );
  });
});

describe('BalanceHero', () => {
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
  const trend: MonthlyTrendPoint[] = [
    { month: '2026-08', label: 'Aug 26', income: 0, expense: 0, net: 0 },
    { month: '2026-09', label: 'Sep 26', income: 5_000_000, expense: 1_000_000, net: 4_000_000 },
  ];

  it('presents the balance from brief §39 as the headline figure', () => {
    render(
      <BalanceHero
        summary={summary}
        currentMonth={currentMonth}
        monthlyTrend={trend}
        currency="IDR"
      />,
    );

    expect(screen.getByText('Current balance')).toBeInTheDocument();
    // The exact figure is exposed via aria-label so it is never read mid-animation.
    expect(screen.getByLabelText(/Rp\s?5\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    // Month net flow, rendered signed.
    expect(screen.getByText(/\+Rp\s?4\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/80% saved/)).toBeInTheDocument();
  });

  it('omits the savings rate when there was no income to divide by', () => {
    render(
      <BalanceHero
        summary={{ ...summary, totalIncome: 0, savingsRate: null }}
        currentMonth={{ ...currentMonth, income: 0, net: -1_000_000, savingsRate: null }}
        monthlyTrend={trend}
        currency="IDR"
      />,
    );

    expect(screen.queryByText(/saved$/)).not.toBeInTheDocument();
    expect(screen.getByText(/−Rp\s?1\.000\.000/)).toBeInTheDocument();
  });
});

describe('SummaryTiles', () => {
  const summary: DashboardData['summary'] = {
    balance: 5_000_000,
    totalIncome: 5_000_000,
    totalExpense: 1_000_000,
    savings: 4_000_000,
    savingsRate: 80,
  };

  it('renders the all-time totals with the savings rate', () => {
    render(<SummaryTiles summary={summary} currency="IDR" />);

    expect(screen.getByText('Total income')).toBeInTheDocument();
    expect(screen.getByText('Total expense')).toBeInTheDocument();
    expect(screen.getByText('Savings')).toBeInTheDocument();
    expect(screen.getByLabelText(/Rp\s?4\.000\.000/)).toBeInTheDocument();
    expect(screen.getByText(/of your income saved/)).toBeInTheDocument();
  });

  it('explains a missing savings rate instead of showing a broken percentage', () => {
    render(
      <SummaryTiles
        summary={{ ...summary, totalIncome: 0, savings: 0, savingsRate: null }}
        currency="IDR"
      />,
    );

    expect(screen.getByText(/Record income to see your savings rate/)).toBeInTheDocument();
  });
});

describe('InsightList', () => {
  const insights: Insight[] = [
    { id: 'a', tone: 'neutral', title: 'Average daily spend', message: 'You spend Rp 21.667 per day.' },
    { id: 'b', tone: 'critical', title: 'Food budget exceeded', message: 'You are over by Rp 200.000.' },
    { id: 'c', tone: 'warning', title: 'Spending increased', message: 'Up 20% on last month.' },
  ];

  it('orders actionable insights first', () => {
    render(<InsightList insights={insights} />);

    const titles = screen.getAllByRole('listitem').map((item) => item.textContent ?? '');
    expect(titles[0]).toContain('Food budget exceeded');
    expect(titles[1]).toContain('Spending increased');
    expect(titles[2]).toContain('Average daily spend');
  });

  it('respects a display limit', () => {
    render(<InsightList insights={insights} limit={2} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});

describe('SegmentedControl', () => {
  it('marks the selected option and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        label="Filter by type"
        value="ALL"
        onChange={onChange}
        options={[
          { value: 'ALL', label: 'All' },
          { value: 'INCOME', label: 'Income' },
        ]}
      />,
    );

    expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Income' })).toHaveAttribute('aria-checked', 'false');

    await userEvent.click(screen.getByRole('radio', { name: 'Income' }));
    expect(onChange).toHaveBeenCalledWith('INCOME');
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
