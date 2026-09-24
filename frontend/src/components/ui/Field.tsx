import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

/**
 * Form controls.
 *
 * Each control wires `aria-invalid` and `aria-describedby` to its error message
 * so the failure is announced to assistive technology, not just coloured red
 * (brief §29 + accessibility).
 */

const FIELD_BASE =
  'w-full rounded-lg border bg-white px-3 text-slate-800 transition placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400';

const borderFor = (hasError: boolean): string =>
  hasError
    ? 'border-expense focus:border-expense focus:ring-1 focus:ring-expense'
    : 'border-slate-300 focus:border-primary-500 focus:ring-1 focus:ring-primary-500';

interface FieldWrapperProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

const FieldWrapper = ({ id, label, error, hint, required, children }: FieldWrapperProps) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-medium text-slate-700">
      {label}
      {required && (
        <span className="ml-0.5 text-expense" aria-hidden="true">
          *
        </span>
      )}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="text-sm text-expense">
        {error}
      </p>
    ) : hint ? (
      <p id={`${id}-hint`} className="text-sm text-slate-500">
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
  /** Rendered inside the field, e.g. a currency symbol. */
  prefix?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, prefix, className, required, ...rest }, ref) => {
    const id = useId();
    return (
      <FieldWrapper id={id} label={label} error={error} hint={hint} required={required}>
        <div className="relative">
          {prefix && (
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
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
              'h-10',
              borderFor(Boolean(error)),
              prefix && 'pl-9',
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
        <select
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={clsx(FIELD_BASE, 'h-10', borderFor(Boolean(error)), className)}
          {...rest}
        >
          {children}
        </select>
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
          className={clsx(FIELD_BASE, 'py-2', borderFor(Boolean(error)), className)}
          {...rest}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = 'Textarea';
