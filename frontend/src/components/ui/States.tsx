import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw, WifiOff } from 'lucide-react';
import { ApiError } from '../../services/api';
import { Button } from './Button';

/**
 * Empty and error states (brief §28, §29).
 *
 * Never a blank panel. An empty state names what is missing and offers the single
 * action that fixes it; an error state shows the server's user-safe message and
 * always offers a retry. Neither ever exposes internal detail.
 */

/**
 * Decorative illustration: concentric rings behind the icon. Cheap inline SVG
 * rather than an asset, so there is no extra request and it inherits currentColor.
 */
const IllustrationFrame = ({
  children,
  tone = 'accent',
}: {
  children: ReactNode;
  tone?: 'accent' | 'expense';
}) => {
  const ring = tone === 'accent' ? 'text-accent-200' : 'text-expense-200';
  const chip =
    tone === 'accent' ? 'bg-accent-50 text-accent-600' : 'bg-expense-50 text-expense-600';

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className={`absolute inset-0 ${ring}`} viewBox="0 0 96 96" fill="none" aria-hidden="true">
        <circle cx="48" cy="48" r="47" stroke="currentColor" strokeWidth="1" strokeDasharray="3 5" opacity="0.7" />
        <circle cx="48" cy="48" r="34" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      </svg>
      <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${chip}`}>
        {children}
      </span>
    </div>
  );
};

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  compact?: boolean;
}

export const EmptyState = ({
  icon,
  title,
  message,
  action,
  secondaryAction,
  compact = false,
}: EmptyStateProps) => (
  <div
    className={`flex flex-col items-center justify-center gap-4 px-6 text-center ${
      compact ? 'py-10' : 'py-16'
    }`}
  >
    {icon && <IllustrationFrame>{icon}</IllustrationFrame>}
    <div className="space-y-1.5">
      <h3 className="text-base font-bold tracking-tight text-ink-900">{title}</h3>
      {message && <p className="mx-auto max-w-sm text-[0.875rem] leading-relaxed text-ink-500">{message}</p>}
    </div>
    {(action || secondaryAction) && (
      <div className="flex flex-col gap-2 sm:flex-row">
        {action && <Button onClick={action.onClick}>{action.label}</Button>}
        {secondaryAction && (
          <Button variant="secondary" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    )}
  </div>
);

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

/**
 * Only an `ApiError` carries a message that was written for a user. Anything else
 * is an unexpected runtime failure, whose message could leak internals, so it is
 * replaced with the generic wording.
 */
export const resolveErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError) return error.message;
  return 'Something went wrong. Please try again.';
};

export const ErrorState = ({ error, onRetry, title }: ErrorStateProps) => {
  const isNetworkError = error instanceof ApiError && error.code === 'NETWORK_ERROR';

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <IllustrationFrame tone="expense">
        {isNetworkError ? (
          <WifiOff className="h-6 w-6" aria-hidden="true" />
        ) : (
          <AlertTriangle className="h-6 w-6" aria-hidden="true" />
        )}
      </IllustrationFrame>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold tracking-tight text-ink-900">
          {title ?? (isNetworkError ? 'Cannot reach the server' : 'Something went wrong')}
        </h3>
        <p className="mx-auto max-w-sm text-[0.875rem] leading-relaxed text-ink-500">
          {resolveErrorMessage(error)}
        </p>
      </div>
      {onRetry && (
        <Button
          variant="secondary"
          onClick={onRetry}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Try again
        </Button>
      )}
    </div>
  );
};

/** Full-page loader used while the session is being established. */
export const PageLoader = ({ message = 'Loading FinanceTrack…' }: { message?: string }) => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-accent-400/40" aria-hidden="true" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-accent-600" />
        </span>
      </div>
      <p className="text-[0.8125rem] font-medium text-ink-500" role="status">
        {message}
      </p>
    </div>
  </div>
);
