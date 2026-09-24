import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import clsx from 'clsx';
import type { BudgetStatus } from '../../types';
import { Button } from './Button';

// ---------------------------------------------------------------------------
// Card
// ---------------------------------------------------------------------------

interface CardProps {
  title?: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** `flush` removes body padding, for cards that contain a full-bleed table. */
  padding?: 'default' | 'flush' | 'tight';
  interactive?: boolean;
}

export const Card = ({
  title,
  description,
  eyebrow,
  action,
  children,
  className,
  bodyClassName,
  padding = 'default',
  interactive = false,
}: CardProps) => (
  <section className={clsx(interactive ? 'surface-interactive' : 'surface', 'overflow-hidden', className)}>
    {(title || action) && (
      <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="min-w-0 space-y-0.5">
          {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
          {title && <h2 className="text-base font-bold tracking-tight text-ink-900">{title}</h2>}
          {description && <p className="text-[0.8125rem] text-ink-500">{description}</p>}
        </div>
        {action}
      </header>
    )}
    <div
      className={clsx(
        bodyClassName ??
          {
            default: clsx('px-5 py-5 sm:px-6', title && 'pt-4'),
            tight: clsx('px-4 py-4', title && 'pt-3'),
            flush: '',
          }[padding],
      )}
    >
      {children}
    </div>
  </section>
);

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

type BadgeTone = 'neutral' | 'income' | 'expense' | 'warn' | 'accent';

const BADGE_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-ink-100 text-ink-600 ring-ink-200',
  income: 'bg-income-50 text-income-700 ring-income-200',
  expense: 'bg-expense-50 text-expense-700 ring-expense-200',
  warn: 'bg-warn-50 text-warn-700 ring-warn-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-200',
};

export const Badge = ({
  tone = 'neutral',
  children,
  className,
  dot = false,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-wide ring-1 ring-inset',
      BADGE_TONES[tone],
      className,
    )}
  >
    {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />}
    {children}
  </span>
);

/** Budget status vocabulary. Colours follow brief §26: amber warns, red exceeds. */
export const BUDGET_STATUS_TONE: Record<BudgetStatus, BadgeTone> = {
  SAFE: 'income',
  WARNING: 'warn',
  EXCEEDED: 'expense',
};

export const BUDGET_STATUS_LABEL: Record<BudgetStatus, string> = {
  SAFE: 'Safe',
  WARNING: 'Warning',
  EXCEEDED: 'Exceeded',
};

// ---------------------------------------------------------------------------
// Segmented control
// ---------------------------------------------------------------------------

/**
 * Segmented control for small, mutually exclusive choices (type filter, period).
 * Preferred over a `<select>` when there are 2–5 options: the alternatives stay
 * visible, which is faster to scan and one tap instead of two.
 */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export const SegmentedControl = <T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  className,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}) => (
  <div
    role="radiogroup"
    aria-label={label}
    className={clsx(
      'inline-flex items-center gap-1 rounded-xl border border-ink-200 bg-ink-100/70 p-1',
      fullWidth && 'w-full',
      className,
    )}
  >
    {options.map((option) => {
      const isActive = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={isActive}
          onClick={() => onChange(option.value)}
          className={clsx(
            'press inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-all duration-200',
            size === 'sm' ? 'h-7 px-2.5 text-[0.75rem]' : 'h-8 px-3 text-[0.8125rem]',
            isActive
              ? 'bg-white text-ink-900 shadow-subtle'
              : 'text-ink-500 hover:text-ink-800',
          )}
        >
          {option.icon}
          {option.label}
        </button>
      );
    })}
  </div>
);

// ---------------------------------------------------------------------------
// Filter chip
// ---------------------------------------------------------------------------

/** Removable chip summarising one active filter, so filter state is never hidden. */
export const Chip = ({
  children,
  onRemove,
  removeLabel,
}: {
  children: ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-200 bg-accent-50 py-1 pl-3 pr-1.5 text-[0.75rem] font-semibold text-accent-700">
    {children}
    <button
      type="button"
      onClick={onRemove}
      aria-label={removeLabel}
      className="rounded-full p-0.5 text-accent-500 transition hover:bg-accent-200/70 hover:text-accent-800"
    >
      <X className="h-3 w-3" aria-hidden="true" />
    </button>
  </span>
);

// ---------------------------------------------------------------------------
// Progress
// ---------------------------------------------------------------------------

const PROGRESS_FILL: Record<BudgetStatus, string> = {
  SAFE: 'bg-income-gradient',
  WARNING: 'bg-gradient-to-r from-warn-500 to-warn-400',
  EXCEEDED: 'bg-expense-gradient',
};

const RING_STROKE: Record<BudgetStatus, string> = {
  SAFE: 'stroke-income-500',
  WARNING: 'stroke-warn-500',
  EXCEEDED: 'stroke-expense-500',
};

interface ProgressBarProps {
  /** Percentage used. Clamped for the bar; the caller still shows the true figure. */
  value: number;
  status: BudgetStatus;
  label: string;
  className?: string;
}

export const ProgressBar = ({ value, status, label, className }: ProgressBarProps) => (
  <div
    role="progressbar"
    aria-valuenow={Math.round(value)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={label}
    className={clsx('h-2 w-full overflow-hidden rounded-full bg-ink-200/80', className)}
  >
    <div
      className={clsx('h-full rounded-full transition-[width] duration-700 ease-out-expo', PROGRESS_FILL[status])}
      style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
    />
  </div>
);

/**
 * Circular progress. Used on budget cards because a ring reads as a gauge —
 * "how much of my allowance is gone" — far more immediately than a flat bar, and
 * it leaves the horizontal space for the figures.
 */
export const RingProgress = ({
  value,
  status,
  label,
  size = 96,
  strokeWidth = 8,
  children,
}: {
  value: number;
  status: BudgetStatus;
  label: string;
  size?: number;
  strokeWidth?: number;
  children?: ReactNode;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(value, 0), 100);
  const offset = circumference - (clamped / 100) * circumference;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-ink-200/80"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx('fill-none transition-[stroke-dashoffset] duration-1000 ease-out-expo', RING_STROKE[status])}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Stat tile
// ---------------------------------------------------------------------------

/**
 * Compact figure tile. Lower visual weight than the balance hero on purpose —
 * these are supporting numbers, and a screen where everything shouts has no
 * hierarchy at all.
 */
export const StatTile = ({
  label,
  value,
  caption,
  icon,
  tone = 'neutral',
  className,
}: {
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  icon?: ReactNode;
  tone?: 'neutral' | 'income' | 'expense' | 'accent';
  className?: string;
}) => {
  const tones = {
    neutral: { chip: 'bg-ink-100 text-ink-500', value: 'text-ink-900' },
    income: { chip: 'bg-income-50 text-income-600', value: 'text-income-700' },
    expense: { chip: 'bg-expense-50 text-expense-600', value: 'text-expense-700' },
    accent: { chip: 'bg-accent-50 text-accent-600', value: 'text-accent-700' },
  }[tone];

  return (
    <div className={clsx('surface-interactive p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="label-eyebrow">{label}</p>
        {icon && (
          <span className={clsx('flex h-8 w-8 items-center justify-center rounded-lg', tones.chip)}>
            {icon}
          </span>
        )}
      </div>
      <p className={clsx('mt-3 break-words text-xl font-bold tracking-tight sm:text-[1.375rem]', tones.value)}>
        {value}
      </p>
      {caption && <div className="mt-1.5 text-[0.8125rem] text-ink-500">{caption}</div>}
    </div>
  );
};

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
      className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-5 py-3.5 sm:flex-row sm:px-6"
      aria-label="Transaction pages"
    >
      <p className="text-[0.8125rem] text-ink-500 tabular">
        <span className="font-semibold text-ink-800">
          {firstItem}–{lastItem}
        </span>{' '}
        of <span className="font-semibold text-ink-800">{totalItems}</span>
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPreviousPage}
          leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
        >
          Previous
        </Button>
        <span className="px-2 text-[0.8125rem] font-medium text-ink-500 tabular">
          {page} / {Math.max(totalPages, 1)}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
        >
          Next
        </Button>
      </div>
    </nav>
  );
};
