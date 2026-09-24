import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export const NotFoundPage = () => (
  <div className="flex min-h-screen items-center justify-center px-4">
    <div className="max-w-sm space-y-4 text-center">
      <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold text-slate-900">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you were looking for doesn&apos;t exist or has moved.
        </p>
      </div>
      <Link
        to="/dashboard"
        className="inline-flex h-10 items-center rounded-lg bg-primary-600 px-4 text-sm font-medium text-white transition hover:bg-primary-700"
      >
        Back to dashboard
      </Link>
    </div>
  </div>
);
