import { useState, type FocusEvent } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useAuth } from '../hooks/useAuth';
import { usePointerVars, useReducedMotion } from '../hooks/useMotion';
import { PageLoader } from '../components/ui/States';
import { APP_NAME, Logo, Mascot } from '../components/ui/Logo';
import { AuthShowcase } from '../components/auth/AuthShowcase';
import { AuthTabs } from '../components/auth/AuthTabs';
import { FeatureBubbles } from '../components/auth/FeatureBubbles';

/**
 * Layout for the unauthenticated pages.
 *
 * Signed-in visitors are redirected away, so the back button cannot land someone
 * on a login form they no longer need.
 *
 * Visually it is one continuous, borderless canvas rather than a hard split:
 * drifting colour blooms, a spotlight that follows the cursor, a parallax
 * product preview (desktop only) and a frosted form card. The mascot peeks over
 * the card, leans towards the cursor, and politely ducks out of sight while a
 * password field is focused.
 *
 * Every pointer effect is driven by CSS custom properties written outside
 * React, and all of it switches off under `prefers-reduced-motion`. Feature
 * highlights are bubbles that roam the page and bounce off the form card.
 */

/** Parallax for a background layer, scaled by depth. */
const drift = (px: number) => ({
  transform: `translate3d(calc(var(--mx, 0) * ${px}px), calc(var(--my, 0) * ${px}px), 0)`,
});

export const AuthLayout = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader message="Checking your session…" />;

  if (user) {
    return <Navigate to={user.onboardingCompleted ? '/dashboard' : '/onboarding'} replace />;
  }

  return <AuthCanvas />;
};

/**
 * Split out from the guard above so the pointer hook's effect runs when the
 * canvas element actually exists, not during the session-check render.
 */
const AuthCanvas = () => {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const pageRef = usePointerVars<HTMLDivElement>({ disabled: reducedMotion });
  const [mascotShy, setMascotShy] = useState(false);
  const [wiggles, setWiggles] = useState(0);

  // React's onFocus/onBlur bubble, so one handler on the card covers every field.
  const onCardFocus = (event: FocusEvent<HTMLDivElement>) =>
    setMascotShy(event.target instanceof HTMLInputElement && event.target.type === 'password');

  return (
    <div ref={pageRef} className="theme-static relative min-h-screen overflow-hidden bg-[#f6f7fc] text-ink-700">
      {/* ---------------------------------------------------------------- */}
      {/* Ambient background                                               */}
      {/* ---------------------------------------------------------------- */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        <div className="absolute -left-32 -top-32 transition-transform duration-1000 ease-out-expo" style={drift(-30)}>
          <div className="h-[520px] w-[520px] animate-blob rounded-full bg-accent-300/40 blur-3xl" />
        </div>
        <div className="absolute -right-40 top-1/4 transition-transform duration-1000 ease-out-expo" style={drift(40)}>
          <div className="h-[460px] w-[460px] animate-blob-slow rounded-full bg-grape-400/30 blur-3xl" />
        </div>
        <div className="absolute -bottom-40 left-1/3 transition-transform duration-1000 ease-out-expo" style={drift(-20)}>
          <div className="h-[420px] w-[420px] animate-blob rounded-full bg-income-200/40 blur-3xl [animation-delay:-6s]" />
        </div>

        {/* Dot grid, faded out towards the edges. */}
        <div
          className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(99_102_241/0.18)_1px,transparent_1px)] [background-size:22px_22px]"
          style={{ maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)' }}
        />

        {/* Spotlight that follows the cursor. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(520px circle at var(--px, 30%) var(--py, 20%), rgb(129 140 248 / 0.16), transparent 60%)',
          }}
        />
      </div>

      <FeatureBubbles disabled={reducedMotion} />

      {/* ---------------------------------------------------------------- */}
      {/* Content                                                          */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-start gap-12 px-5 py-10 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-14">
        <section className="hidden animate-reveal-up lg:block">
          <div data-bubble-obstacle className="inline-block"><Logo className="h-14" /></div>

          <h2 data-bubble-obstacle className="mt-10 max-w-md text-display-lg text-ink-900">
            Know where your{' '}
            <span className="bg-accent-gradient bg-clip-text text-transparent">money goes.</span>
          </h2>
          <p data-bubble-obstacle className="mt-4 max-w-md text-[0.9375rem] leading-relaxed text-ink-500">
            A personal finance tracker for students and young professionals who want to start
            managing their money properly.
          </p>

          <div className="mt-10 animate-reveal-scale stagger-3">
            <AuthShowcase disabled={reducedMotion} />
          </div>

          <p data-bubble-obstacle className="mt-6 inline-block text-[0.75rem] text-ink-400">
            {APP_NAME} records and analyses money. It never moves it.
          </p>
        </section>

        {/* Top-aligned (not centred) so the card's top edge stays put when the
            register form makes it taller — it only grows downwards. */}
        <main className="mx-auto w-full max-w-[440px] lg:mt-10">
          <div data-bubble-obstacle className="mx-auto w-fit lg:hidden">
            <Logo className="mx-auto h-14" />
          </div>

          <div className="relative pt-16">
            {/* Mascot: sits behind the card, so ducking means sliding down under it. */}
            <div
              aria-hidden="true"
              data-bubble-obstacle
              className={clsx(
                'absolute right-10 top-0 z-0 transition-transform duration-500 ease-spring',
                mascotShy ? 'translate-y-[72%]' : 'translate-y-0',
              )}
            >
              <div
                className="transition-transform duration-700 ease-out-expo"
                style={{
                  transform:
                    'translateX(calc(var(--mx, 0) * 8px)) rotate(calc(var(--mx, 0) * 10deg))',
                }}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setWiggles((count) => count + 1)}
                  className="block cursor-pointer focus:outline-none"
                >
                  <Mascot
                    key={wiggles}
                    className={clsx('h-24 w-24 drop-shadow-lg', wiggles > 0 && 'animate-wiggle')}
                  />
                </button>
              </div>
            </div>

            <div
             onFocus={onCardFocus}
              onBlur={() => setMascotShy(false)}
              data-bubble-obstacle className="relative z-10 animate-reveal-up rounded-[2rem] bg-white/85 p-6 shadow-float ring-1 ring-white/70 backdrop-blur-2xl sm:p-9"
            >
              <AuthTabs />
              {/* Keyed by route so switching tabs replays the entrance. */}
              <div key={location.pathname} className="mt-7 animate-reveal-up">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
