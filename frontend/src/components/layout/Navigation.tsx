import { NavLink } from 'react-router-dom';
import { LogOut, Menu, Plus, Sparkles, TrendingUp, X } from 'lucide-react';
import clsx from 'clsx';
import { NAV_ITEMS } from './navItems';
import { Button, Fab } from '../ui/Button';
import { AnimatedCurrency } from '../ui/Motion';
import type { Currency, User } from '../../types';

/**
 * Navigation chrome.
 *
 * Desktop gets a persistent sidebar; mobile gets a fixed bottom bar with the
 * "add transaction" action raised into a centre FAB, because that is the one
 * action a user repeats several times a day and it deserves a thumb-reachable
 * target. Both surfaces render the same `NAV_ITEMS`, so a new page appears
 * everywhere at once.
 */

const Brand = ({ className }: { className?: string }) => (
  <div className={clsx('flex items-center gap-2.5', className)}>
    <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-accent-gradient text-white shadow-glow">
      <TrendingUp className="h-5 w-5" aria-hidden="true" />
    </span>
    <div className="leading-tight">
      <p className="font-display text-[0.9375rem] font-extrabold tracking-tight text-ink-900">
        FinanceTrack
      </p>
      <p className="text-[0.6875rem] font-medium text-ink-500">Know where your money goes</p>
    </div>
  </div>
);

/** Initials avatar — avoids shipping placeholder photos for real people. */
const Avatar = ({ name }: { name: string }) => {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-gradient text-[0.8125rem] font-bold text-white"
      aria-hidden="true"
    >
      {initials || '?'}
    </span>
  );
};

interface SidebarBodyProps {
  user: User | null;
  balance?: number;
  currency: Currency;
  onLogout: () => void;
  onAddTransaction: () => void;
  onNavigate?: () => void;
}

const SidebarBody = ({
  user,
  balance,
  currency,
  onLogout,
  onAddTransaction,
  onNavigate,
}: SidebarBodyProps) => (
  <div className="flex h-full flex-col gap-5 p-4">
    <Brand className="px-1 pt-1" />

    {/* Balance recap in the rail: the headline figure stays visible on every
        page, not just the dashboard. */}
    {balance !== undefined && (
      <div className="relative overflow-hidden rounded-2xl bg-ink-900 p-4 text-white">
        <div className="absolute inset-0 bg-mesh-accent opacity-60" aria-hidden="true" />
        <div className="relative">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white/60">
            Current balance
          </p>
          <AnimatedCurrency
            value={balance}
            currency={currency}
            as="p"
            className="mt-1 text-xl font-bold text-white"
          />
        </div>
      </div>
    )}

    <Button
      fullWidth
      onClick={() => {
        onAddTransaction();
        onNavigate?.();
      }}
      leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
    >
      Add transaction
    </Button>

    <nav className="flex-1 space-y-1" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            clsx(
              'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[0.875rem] font-semibold transition-all duration-200',
              isActive
                ? 'bg-accent-50 text-accent-700'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Left rail marker makes the active page unmistakable at a glance. */}
              <span
                className={clsx(
                  'absolute left-0 h-5 w-[3px] rounded-r-full bg-accent-gradient transition-all duration-300',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
                aria-hidden="true"
              />
              <item.icon
                className={clsx(
                  'h-[1.125rem] w-[1.125rem] shrink-0 transition-transform duration-200',
                  !isActive && 'group-hover:scale-110',
                )}
                aria-hidden="true"
              />
              {item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>

    <div className="space-y-1 border-t border-ink-100 pt-3">
      {user && (
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.8125rem] font-semibold text-ink-800">{user.name}</p>
            <p className="truncate text-[0.6875rem] text-ink-500">{user.email}</p>
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        fullWidth
        onClick={onLogout}
        leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
        className="justify-start"
      >
        Sign out
      </Button>
    </div>
  </div>
);

interface SidebarProps extends Omit<SidebarBodyProps, 'onNavigate'> {
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
}

export const Sidebar = ({ isDrawerOpen, onCloseDrawer, ...body }: SidebarProps) => (
  <>
    <aside className="hidden w-[17rem] shrink-0 border-r border-ink-200/70 bg-white lg:block">
      <div className="sticky top-0 h-screen overflow-y-auto">
        <SidebarBody {...body} />
      </div>
    </aside>

    {isDrawerOpen && (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div
          className="absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm"
          onClick={onCloseDrawer}
          aria-hidden="true"
        />
        <div className="relative h-full w-[17rem] max-w-[86%] animate-reveal-up overflow-y-auto bg-white shadow-float">
          <button
            type="button"
            onClick={onCloseDrawer}
            className="absolute right-3 top-3 rounded-xl p-2 text-ink-400 transition hover:bg-ink-100"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
          <SidebarBody {...body} onNavigate={onCloseDrawer} />
        </div>
      </div>
    )}
  </>
);

// ---------------------------------------------------------------------------

export const Topbar = ({
  title,
  subtitle,
  onOpenDrawer,
}: {
  title: string;
  subtitle?: string;
  onOpenDrawer: () => void;
}) => (
  <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-200/70 bg-white/85 px-4 py-3 backdrop-blur-xl lg:hidden">
    <button
      type="button"
      onClick={onOpenDrawer}
      className="press rounded-xl border border-ink-200 bg-white p-2 text-ink-600 shadow-subtle transition hover:bg-ink-50"
      aria-label="Open navigation"
    >
      <Menu className="h-4 w-4" aria-hidden="true" />
    </button>
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[0.9375rem] font-bold tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="truncate text-[0.6875rem] text-ink-500">{subtitle}</p>}
    </div>
    <span
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-600"
      aria-hidden="true"
    >
      <Sparkles className="h-4 w-4" />
    </span>
  </header>
);

// ---------------------------------------------------------------------------

/**
 * Mobile bottom navigation. The five nav items are split around a raised FAB,
 * which keeps the primary action centred under the thumb.
 */
export const BottomNav = ({ onAddTransaction }: { onAddTransaction: () => void }) => {
  const midpoint = Math.ceil(NAV_ITEMS.length / 2);
  const left = NAV_ITEMS.slice(0, midpoint);
  const right = NAV_ITEMS.slice(midpoint);

  const renderItem = (item: (typeof NAV_ITEMS)[number]) => (
    <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) =>
        clsx(
          'flex flex-1 flex-col items-center gap-1 py-2 text-[0.625rem] font-semibold transition-colors',
          isActive ? 'text-accent-700' : 'text-ink-400',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={clsx(
              'flex h-7 w-10 items-center justify-center rounded-lg transition-all duration-200',
              isActive && 'bg-accent-50',
            )}
          >
            <item.icon className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
          </span>
          {item.label}
        </>
      )}
    </NavLink>
  );

  return (
    <>
      {/* FAB floats above the bar rather than inside it, so the bar keeps a
          simple, predictable hit area. */}
      <div className="fixed bottom-7 left-1/2 z-40 -translate-x-1/2 lg:hidden">
        <Fab onClick={onAddTransaction} aria-label="Add transaction">
          <Plus className="h-6 w-6" aria-hidden="true" />
        </Fab>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/70 bg-white/90 pb-safe backdrop-blur-xl lg:hidden"
        aria-label="Main navigation"
      >
        <div className="flex items-stretch">
          {left.map(renderItem)}
          {/* Spacer reserving room for the FAB. */}
          <div className="w-16 shrink-0" aria-hidden="true" />
          {right.map(renderItem)}
        </div>
      </nav>
    </>
  );
};
