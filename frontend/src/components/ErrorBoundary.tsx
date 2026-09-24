import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Last-resort error boundary. A render-time exception anywhere in the tree would
 * otherwise blank the page; this keeps something readable on screen and offers a
 * reload. The error detail goes to the console, never to the user (brief §29).
 */
interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
        <div role="alert" className="max-w-sm space-y-5 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-expense-50 text-expense-600 ring-1 ring-inset ring-expense-100">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h1 className="text-display-sm text-ink-900">Something went wrong</h1>
            <p className="text-[0.875rem] text-ink-500">
              The page failed to load. Reloading usually fixes it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="press inline-flex h-11 items-center rounded-xl bg-accent-gradient px-5 text-[0.875rem] font-semibold text-white shadow-glow transition hover:brightness-110"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
