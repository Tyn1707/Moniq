import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export const NotFoundPage = () => (
  <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4">
    <div className="max-w-sm animate-reveal-up space-y-5 text-center">
      <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
        <svg
          className="absolute inset-0 text-accent-200"
          viewBox="0 0 96 96"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="48" cy="48" r="47" stroke="currentColor" strokeDasharray="3 5" opacity="0.7" />
          <circle cx="48" cy="48" r="34" stroke="currentColor" opacity="0.5" />
        </svg>
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600">
          <Compass className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>
      <div className="space-y-1.5">
        <h1 className="text-display-sm text-ink-900">Page not found</h1>
        <p className="text-[0.875rem] text-ink-500">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="press inline-flex h-11 items-center rounded-xl bg-accent-gradient px-5 text-[0.875rem] font-semibold text-white shadow-glow transition hover:brightness-110"
      >
        Back to dashboard
      </Link>
    </div>
  </div>
);
