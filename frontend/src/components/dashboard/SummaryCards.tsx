import type { ReactNode } from 'react';
import { ArrowDownLeft, ArrowUpRight, PiggyBank, Wallet } from 'lucide-react';
import clsx from 'clsx';
import type { Currency, DashboardData } from '../../types';
import { formatCurrency, formatPercentage } from '../../utils/format';

/**
 * Summary cards (brief §7).
 *
 * The balance is the hero figure and uses the neutral/primary colour; income and
 * expense are green and red respectively. Every number here comes straight from
 * the server's `summary` object — nothing is recomputed in the browser.
 */

interface SummaryCardProps {
  label: string;
  value: string;
  caption?: ReactNode;
  icon: ReactNode;
  accent: 'primary' | 'income' | 'expense' | 'neutral';
  emphasised?: boolean;
}

const ACCENTS = {
  primary: { icon: 'bg-primary-50 text-primary-700', value: 'text-slate-900' },
  income: { icon: 'bg-income-light text-income-dark', value: 'text-income-dark' },
  expense: { icon: 'bg-expense-light text-expense-dark', value: 'text-expense-dark' },
  neutral: { icon: 'bg-slate-100 text-slate-600', value: 'text-slate-900' },
};

const SummaryCard = ({ label, value, caption, icon, accent, emphasised }: SummaryCardProps) => (
  <div
    className={clsx(
      'card p-5',
      emphasised && 'ring-1 ring-primary-100',
    )}
  >
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <span
        className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
          ACCENTS[accent].icon,
        )}
      >
        {icon}
      </span>
    </div>
    <p
      className={clsx(
        'mt-3 break-words font-semibold tabular',
        emphasised ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl',
        ACCENTS[accent].value,
      )}
    >
      {value}
    </p>
    {caption && <div className="mt-1.5 text-xs text-slate-500">{caption}</div>}
  </div>
);

export const SummaryCards = ({
  summary,
  currentMonth,
  currency,
}: {
  summary: DashboardData['summary'];
  currentMonth: DashboardData['currentMonth'];
  currency: Currency;
}) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    <SummaryCard
      label="Current balance"
      value={formatCurrency(summary.balance, currency)}
      caption="Starting balance + income − expenses"
      icon={<Wallet className="h-5 w-5" aria-hidden="true" />}
      accent="primary"
      emphasised
    />
    <SummaryCard
      label="Total income"
      value={formatCurrency(summary.totalIncome, currency)}
      caption={`${formatCurrency(currentMonth.income, currency)} this month`}
      icon={<ArrowUpRight className="h-5 w-5" aria-hidden="true" />}
      accent="income"
    />
    <SummaryCard
      label="Total expense"
      value={formatCurrency(summary.totalExpense, currency)}
      caption={`${formatCurrency(currentMonth.expense, currency)} this month`}
      icon={<ArrowDownLeft className="h-5 w-5" aria-hidden="true" />}
      accent="expense"
    />
    <SummaryCard
      label="Savings"
      value={formatCurrency(summary.savings, currency)}
      caption={
        summary.savingsRate === null
          ? 'Record income to see your savings rate'
          : `${formatPercentage(summary.savingsRate)} of your income saved`
      }
      icon={<PiggyBank className="h-5 w-5" aria-hidden="true" />}
      accent={summary.savings >= 0 ? 'neutral' : 'expense'}
    />
  </div>
);
