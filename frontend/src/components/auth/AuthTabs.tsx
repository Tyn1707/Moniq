import { Link, useLocation } from 'react-router-dom';
import clsx from 'clsx';

/**
 * Sign in / Create account switcher with a sliding pill.
 *
 * These are links, not ARIA tabs: each one is a separate route with its own URL,
 * so `aria-current="page"` is the correct semantic. Router `state` is passed
 * along so a redirect target (`from`) survives switching between the two.
 */
const TABS = [
  { to: '/login', label: 'Sign in' },
  { to: '/register', label: 'Create account' },
] as const;

export const AuthTabs = () => {
  const location = useLocation();
  const activeIndex = Math.max(
    0,
    TABS.findIndex((tab) => tab.to === location.pathname),
  );

  return (
    <nav aria-label="Account" className="relative grid grid-cols-2 rounded-full bg-ink-100/80 p-1">
      <span
        aria-hidden="true"
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white shadow-card transition-transform duration-500 ease-spring"
        style={{ transform: `translateX(${activeIndex * 100}%)` }}
      />
      {TABS.map((tab, index) => {
        const active = index === activeIndex;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            state={location.state}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'relative z-10 rounded-full py-2.5 text-center text-[0.8125rem] font-semibold transition-colors duration-300',
              active ? 'text-ink-900' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
};
