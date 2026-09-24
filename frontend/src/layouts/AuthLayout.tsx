import { Navigate, Outlet } from 'react-router-dom';
import { PieChart, ShieldCheck, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { PageLoader } from '../components/ui/States';

/**
 * Layout for the unauthenticated pages.
 *
 * Signed-in visitors are redirected away, so the back button cannot land someone
 * on a login form they no longer need. The left panel is purely decorative and is
 * dropped below `lg`, where the form itself should own the whole viewport.
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
    body: 'Category breakdowns and monthly trends, in charts you can actually read.',
  },
  {
    icon: ShieldCheck,
    title: 'Private by default',
    body: 'Passwords are hashed, and your data is only ever visible to you.',
  },
];

export const AuthLayout = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader message="Checking your session…" />;

  if (user) {
    return <Navigate to={user.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
  }

  return (
    <div className="flex min-h-screen bg-white">
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink-900 p-10 text-white lg:flex xl:w-[56%]">
        <div className="absolute inset-0 bg-mesh-accent opacity-80" aria-hidden="true" />
        <div
          className="absolute inset-0 bg-grid-faint opacity-40 [background-size:36px_36px]"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-2.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <TrendingUp className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight">FinanceTrack</span>
        </div>

        <div className="relative max-w-md space-y-9">
          <div className="space-y-3">
            <h2 className="text-display-md text-white">Know where your money goes.</h2>
            <p className="text-[0.9375rem] leading-relaxed text-white/70">
              A personal finance tracker for students and young professionals who want to start
              managing their money properly.
            </p>
          </div>

          <ul className="space-y-5">
            {HIGHLIGHTS.map((highlight) => (
              <li key={highlight.title} className="flex gap-3.5">
                <span className="glass flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                  <highlight.icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-[0.875rem] font-bold">{highlight.title}</p>
                  <p className="text-[0.8125rem] leading-relaxed text-white/60">{highlight.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[0.75rem] text-white/50">
          FinanceTrack records and analyses money. It never moves it.
        </p>
      </aside>

      <main className="flex w-full flex-col justify-center px-5 py-10 sm:px-10 lg:w-1/2 xl:w-[44%]">
        <div className="mx-auto w-full max-w-sm animate-reveal-up">
          <div className="mb-9 flex items-center gap-2.5 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-gradient text-white shadow-glow">
              <TrendingUp className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-lg font-extrabold tracking-tight text-ink-900">
              FinanceTrack
            </span>
          </div>
          <Outlet />
        </div>
      </main>
    </div>
  );
};
