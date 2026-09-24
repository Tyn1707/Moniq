import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

/**
 * Form controls.
 *
 * Each control wires `aria-invalid` and `aria-describedby` to its message, so an
 * error is announced rather than merely turned red — colour alone is not an
 * accessible error signal. Errors also carry an icon for the same reason.
 */

const FIELD_BASE =
  'w-full rounded-xl border bg-white text-ink-900 shadow-subtle transition-all duration-200 placeholder:text-ink-400 disabled:cursor-not-allowed disabled:bg-ink-50 disabled:text-ink-400';

const borderFor = (hasError: boolean): string =>
  hasError
    ? 'border-expense-300 focus:border-expense-500 focus:ring-4 focus:ring-expense-100'
    : 'border-ink-200 hover:border-ink-300 focus:border-accent-500 focus:ring-4 focus:ring-accent-100';

interface FieldWrapperProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  trailing?: ReactNode;
  children: ReactNode;
}

const FieldWrapper = ({
  id,
  label,
  error,
  hint,
  required,
  trailing,
  children,
}: FieldWrapperProps) => (
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-3">
      <label htmlFor={id} className="text-[0.8125rem] font-semibold text-ink-700">
        {label}
        {required && (
          <span className="ml-0.5 text-expense-500" aria-hidden="true">
            *
          </span>
        )}
      </label>
      {trailing}
    </div>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-expense-600">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-[0.8125rem] text-ink-500">
        {hint}
      </p>
    ) : null}
  </div>
);

// ---------------------------------------------------------------------------

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
  prefix?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, icon, trailing, className, required, ...rest }, ref) => {
    const id = useId();
    return (
      <FieldWrapper id={id} label={label} error={error} hint={hint} required={required} trailing={trailing}>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              {icon}
            </span>
          )}
          {prefix && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
              {prefix}
            </span>
          )}
          <input
            ref={ref}
            id={id}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={clsx(
              FIELD_BASE,
              'h-11 px-3.5',
              borderFor(Boolean(error)),
              (prefix || icon) && 'pl-10',
              className,
            )}
            {...rest}
          />
        </div>
      </FieldWrapper>
    );
  },
);
Input.displayName = 'Input';

/**
 * Oversized amount input. Money is the headline of the add-transaction form, so
 * it gets display type and its own field rather than sitting in a row of equals.
 */
export const AmountInput = forwardRef<HTMLInputElement, InputProps & { currencyLabel: string }>(
  ({ label, error, hint, currencyLabel, className, required, ...rest }, ref) => {
    const id = useId();
    return (
      <FieldWrapper id={id} label={label} error={error} hint={hint} required={required}>
        <div
          className={clsx(
            'flex items-center gap-2 rounded-2xl border px-4 py-3 transition-all duration-200',
            error
              ? 'border-expense-300 bg-expense-50/40 focus-within:ring-4 focus-within:ring-expense-100'
              : 'border-ink-200 bg-ink-50/60 focus-within:border-accent-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-accent-100',
          )}
        >
          <span className="font-display text-lg font-semibold text-ink-400">{currencyLabel}</span>
          <input
            ref={ref}
            id={id}
            required={required}
            inputMode="decimal"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={clsx(
              'money w-full border-0 bg-transparent p-0 text-2xl font-bold text-ink-900 placeholder:text-ink-300 focus:outline-none focus:ring-0',
              className,
            )}
            {...rest}
          />
        </div>
      </FieldWrapper>
    );
  },
);
AmountInput.displayName = 'AmountInput';

// ---------------------------------------------------------------------------

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, className, children, required, ...rest }, ref) => {
    const id = useId();
    return (
      <FieldWrapper id={id} label={label} error={error} hint={hint} required={required}>
        <div className="relative">
          <select
            ref={ref}
            id={id}
            required={required}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
            className={clsx(
              FIELD_BASE,
              'h-11 appearance-none pl-3.5 pr-10',
              borderFor(Boolean(error)),
              className,
            )}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
            aria-hidden="true"
          />
        </div>
      </FieldWrapper>
    );
  },
);
Select.displayName = 'Select';

// ---------------------------------------------------------------------------

export interface TextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  label: string;
  error?: string;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, required, rows = 3, ...rest }, ref) => {
    const id = useId();
    return (
      <FieldWrapper id={id} label={label} error={error} hint={hint} required={required}>
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={clsx(FIELD_BASE, 'resize-none px-3.5 py-2.5', borderFor(Boolean(error)), className)}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = 'Textarea';

// ---------------------------------------------------------------------------

/**
 * Search box. Separate from `Input` because it carries no label row — the
 * placeholder plus `aria-label` is the established pattern for a toolbar search.
 */
export const SearchInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> & { label: string; icon?: ReactNode }
>(({ label, icon, className, ...rest }, ref) => (
  <div className="relative flex-1">
    {icon && (
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
        {icon}
      </span>
    )}
    <input
      ref={ref}
      type="search"
      aria-label={label}
      className={clsx(
        FIELD_BASE,
        'h-11 pr-3.5',
        icon ? 'pl-10' : 'pl-3.5',
        borderFor(false),
        '[&::-webkit-search-cancel-button]:cursor-pointer',
        className,
      )}
      {...rest}
    />
  </div>
));
SearchInput.displayName = 'SearchInput';
