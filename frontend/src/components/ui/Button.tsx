import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

/**
 * Button.
 *
 * `primary` uses the accent gradient and a coloured glow so the single most
 * important action on a screen is unmistakable. Everything else is deliberately
 * quieter — if two buttons compete, neither reads as primary.
 */

type Variant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent-gradient text-white shadow-glow hover:brightness-[1.08] disabled:opacity-50 disabled:shadow-none',
  secondary:
    'border border-ink-200 bg-white text-ink-700 shadow-subtle hover:border-ink-300 hover:bg-ink-50 disabled:text-ink-400',
  soft: 'bg-accent-50 text-accent-700 hover:bg-accent-100 disabled:text-accent-300',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 disabled:text-ink-400',
  danger: 'bg-expense-gradient text-white shadow-subtle hover:brightness-[1.08] disabled:opacity-50',
  success: 'bg-income-gradient text-white shadow-glow-income hover:brightness-[1.08] disabled:opacity-50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 px-3 text-[0.8125rem]',
  md: 'h-10 gap-2 px-4 text-sm',
  lg: 'h-12 gap-2 px-5 text-[0.9375rem]',
  icon: 'h-10 w-10',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      fullWidth = false,
      className,
      children,
      disabled,
      type = 'button',
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      // A loading button must also be disabled, or a double-click submits twice.
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={clsx(
        'press inline-flex shrink-0 items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  ),
);

Button.displayName = 'Button';

/**
 * Circular floating action button for the mobile "add transaction" affordance.
 * Lifted above the bottom nav because adding a transaction is the one action
 * users repeat many times a day.
 */
export const Fab = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant' | 'size'>>(
  ({ className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type="button"
      className={clsx(
        'press flex h-14 w-14 items-center justify-center rounded-full bg-accent-gradient text-white shadow-glow transition hover:brightness-110',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  ),
);

Fab.displayName = 'Fab';
