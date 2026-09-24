import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError } from '../../services/api';
import { Button } from './Button';

/**
 * Empty state (brief §28). Never show a blank panel: say what is missing and
 * offer the one action that fixes it.
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
}

export const EmptyState = ({ icon, title, message, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
    {icon && (
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        {icon}
      </span>
    )}
    <div className="space-y-1">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {message && <p className="mx-auto max-w-sm text-sm text-slate-500">{message}</p>}
    </div>
    {action && (
      <Button onClick={action.onClick} className="mt-1">
        {action.label}
      </Button>
    )}
  </div>
);

/**
 * Error state (brief §29). Shows the server's user-safe message — never a stack
 * trace — and always offers a retry.
 */
interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error && error.message) return 'Something went wrong. Please try again.';
  return 'Something went wrong. Please try again.';
};

export const ErrorState = ({ error, onRetry, title }: ErrorStateProps) => {
  const isNetworkError = error instanceof ApiError && error.code === 'NETWORK_ERROR';

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center"
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-expense-light text-expense">
        {isNetworkError ? (
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        )}
      </span>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-slate-900">
          {title ?? (isNetworkError ? 'Cannot reach the server' : 'Something went wrong')}
        </h3>
        <p className="mx-auto max-w-sm text-sm text-slate-500">{resolveErrorMessage(error)}</p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          className="mt-1"
        >
          Try again
        </Button>
      )}
    </div>
  );
};
