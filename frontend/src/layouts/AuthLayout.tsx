import { Navigate, Outlet } from 'react-router-dom';
import { PieChart, ShieldCheck, TrendingUp, Wallet } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

/**
 * Layout for the unauthenticated pages. Signed-in visitors are redirected away
 * so the back button cannot land them on a login form they no longer need.
 */

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: 'See your real balance',
    body: 'Every figure is calculated from your own transactions — never an estimate.',
  },
  {
    icon: PieChart,
    title: 'Know where money goes',
    body: 'Category breakdowns and monthly trends, in plain charts.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Passwords are hashed and your data is only ever visible to you.',
  },
];

export const AuthLayout = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-primary-600" />
        <span className="sr-only" role="status">
          Loading
        </span>
      </div>
    );
  }

  if (user) {
    return <Navigate to={user.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Marketing panel is decorative; hidden on small screens to keep the
          form above the fold. */}
      <aside className="hidden w-1/2 flex-col justify-between bg-primary-700 p-10 text-white lg:flex xl:w-[55%]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
            <Wallet className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="text-lg font-semibold">FinanceTrack</span>
        </div>

        <div className="max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight">Know where your money goes.</h2>
            <p className="text-primary-100">
              A simple personal finance tracker for students and young professionals who want to
              start managing their money properly.
            </p>
          </div>

          <ul className="space-y-5">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15">
                  <highlight.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium">{highlight.title}</p>
                  <p className="text-sm text-primary-100">{highlight.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-primary-200">
          FinanceTrack is a tracking and analysis tool. It never moves real money.
        </p>
      </aside>

      <main className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-1/2 xl:w-[45%]">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 text-white">
              <Wallet className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold text-slate-900">FinanceTrack</span>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
