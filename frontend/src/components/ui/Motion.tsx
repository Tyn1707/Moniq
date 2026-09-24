import type { ElementType, ReactNode } from 'react';
import clsx from 'clsx';
import { useCountUp } from '../../hooks/useMotion';
import { formatCurrency, formatPercentage } from '../../utils/format';
import type { Currency } from '../../types';

/**
 * A money figure that counts up on mount.
 *
 * The animation is cosmetic only: `useCountUp` returns the final value straight
 * away when motion is reduced or unavailable, so the correct number is always in
 * the DOM. The element carries the exact formatted figure in `aria-label` too,
 * so assistive technology never reads a mid-animation value.
 */
interface AnimatedCurrencyProps {
  value: number;
  currency: Currency;
  className?: string;
  /** Render `+`/`−` explicitly, for transaction-style figures. */
  signed?: boolean;
  compact?: boolean;
  as?: ElementType;
  animate?: boolean;
}

export const AnimatedCurrency = ({
  value,
  currency,
  className,
  signed = false,
  compact = false,
  as: Tag = 'span',
  animate = true,
}: AnimatedCurrencyProps) => {
  const animated = useCountUp(value, { disabled: !animate });
  const finalLabel = formatCurrency(value, currency, { signed, compact });

  return (
    <Tag className={clsx('money', className)} aria-label={finalLabel}>
      <span aria-hidden="true">{formatCurrency(animated, currency, { signed, compact })}</span>
    </Tag>
  );
};

/** Percentage counterpart, used for budget usage and savings rate. */
export const AnimatedPercentage = ({
  value,
  className,
  fractionDigits = 0,
  animate = true,
}: {
  value: number | null;
  className?: string;
  fractionDigits?: number;
  animate?: boolean;
}) => {
  const animated = useCountUp(value ?? 0, { disabled: !animate || value === null });
  const finalLabel = formatPercentage(value, fractionDigits);

  if (value === null) return <span className={clsx('tabular', className)}>{finalLabel}</span>;

  return (
    <span className={clsx('tabular', className)} aria-label={finalLabel}>
      <span aria-hidden="true">{formatPercentage(animated, fractionDigits)}</span>
    </span>
  );
};

/**
 * Entrance wrapper. Applies a CSS keyframe plus an optional stagger delay, so a
 * list of cards arrives in sequence instead of all at once. Purely a class
 * applicator — it renders no extra behaviour and no extra DOM beyond one div.
 */

/**
 * Written out in full rather than built with a template literal: Tailwind scans
 * source for literal class names, and `stagger-${n}` would be purged from the
 * stylesheet because it never appears as text.
 */
const STAGGER_CLASSES = [
  '',
  'stagger-1',
  'stagger-2',
  'stagger-3',
  'stagger-4',
  'stagger-5',
  'stagger-6',
] as const;

/** Stagger delay class for the nth item in a list (0-based). */
export const staggerClass = (index: number): string =>
  STAGGER_CLASSES[Math.min(index, STAGGER_CLASSES.length - 1)] ?? '';

export const Reveal = ({
  children,
  delayStep = 0,
  variant = 'up',
  className,
}: {
  children: ReactNode;
  /** 0–6; maps to a 60ms-per-step delay. */
  delayStep?: number;
  variant?: 'up' | 'scale';
  className?: string;
}) => (
  <div
    className={clsx(
      variant === 'up' ? 'animate-reveal-up' : 'animate-reveal-scale',
      STAGGER_CLASSES[Math.min(delayStep, STAGGER_CLASSES.length - 1)],
      className,
    )}
  >
    {children}
  </div>
);
