import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { BudgetStatus } from '../../types';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface CardProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export const Card = ({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: CardProps) => (
  <section className={clsx('card', className)}>
    {(title || action) && (
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="space-y-0.5">
          {title && <h2 className="text-base font-semibold text-slate-900">{title}</h2>}
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </header>
    )}
    <div className={clsx(bodyClassName ?? 'p-5')}>{children}</div>
  </section>
);

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

type BadgeTone = 'neutral' | 'income' | 'expense' | 'warning' | 'primary';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-600',
  income: 'bg-income-light text-income-dark',
  expense: 'bg-expense-light text-expense-dark',
  warning: 'bg-warning-light text-warning-dark',
  primary: 'bg-primary-50 text-primary-700',
};

export const Badge = ({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
      BADGE_TONES[tone],
      className,
    )}
  >
    {children}
  </span>
);

/** Budget status pill. Colours follow brief §26: amber warns, red exceeds. */
export const BUDGET_STATUS_TONE: Record<BudgetStatus, BadgeTone> = {
  SAFE: 'income',
  WARNING: 'warning',
  EXCEEDED: 'expense',
};

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  SAFE: 'Safe',
  WARNING: 'Warning',
  EXCEEDED: 'Exceeded',
};

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

const PROGRESS_COLOURS: Record<BudgetStatus, string> = {
  SAFE: 'bg-income',
  WARNING: 'bg-warning',
  EXCEEDED: 'bg-expense',
};

interface ProgressBarProps {
  /** Percentage used. Values above 100 are clamped for the bar, not for the label. */
  value: number;
  status: BudgetStatus;
  label: string;
}

export const ProgressBar = ({ value, status, label }: ProgressBarProps) => (
  <div
    role="progressbar"
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={label}
    className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
  >
    <div
      className={clsx('h-full rounded-full transition-all', PROGRESS_COLOURS[status])}
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
);

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPageChange: (page: number) => void;
}

export const Pagination = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  hasNextPage,
  hasPreviousPage,
  onPageChange,
}: PaginationProps) => {
  if (totalItems === 0) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalItems);

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 sm:flex-row"
      aria-label="Transaction pages"
    >
      <p className="text-sm text-slate-500 tabular">
        Showing <span className="font-medium text-slate-700">{firstItem}</span>–
        <span className="font-medium text-slate-700">{lastItem}</span> of{' '}
        <span className="font-medium text-slate-700">{totalItems}</span>
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        >
          Previous
        </Button>
        <span className="px-1 text-sm text-slate-500 tabular">
          Page {page} of {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
};
