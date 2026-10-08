import { NavLink } from 'react-router-dom';
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, Plus, X } from 'lucide-react';
import clsx from 'clsx';
import { NAV_ITEMS } from './navItems';
import { ThemeToggle } from '../ui/ThemeToggle';
import { Button, Fab } from '../ui/Button';
import { Logo, Mascot } from '../ui/Logo';
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

/**
 * Label shown beside an icon-only control in the collapsed rail. Purely visual:
 * every control that uses it already has an `aria-label`, so it is hidden from
 * assistive tech. Appears on hover and on keyboard focus.
 */
const RailTooltip = ({ label }: { label: string }) => (
  <span
    aria-hidden="true"
    className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 translate-x-[-4px] whitespace-nowrap rounded-lg bg-ink-900 theme-static px-2.5 py-1.5 text-[0.75rem] font-semibold text-white opacity-0 shadow-float transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:translate-x-0 group-focus-visible:opacity-100"
  >
    {label}
  </span>
);

const Brand = ({
  collapsed,
  onToggleCollapse,
}: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
}) => {
  // Collapsed: the mascot stands alone and doubles as the "open" control. On
  // hover/focus it cross-fades into the open-panel icon, so the affordance is
  // discoverable without cluttering the rail.
  if (collapsed) {
    return (
      <button
        type="button"
        onClick={onToggleCollapse}
        aria-label="Open sidebar"
        aria-expanded={false}
        className="group relative mx-auto flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-ink-100 focus-visible:bg-ink-100"
      >
        <Mascot className="h-10 w-10 transition-all duration-200 group-hover:scale-75 group-hover:opacity-0 group-focus-visible:scale-75 group-focus-visible:opacity-0 motion-reduce:transition-none" />
        <PanelLeftOpen
          className="absolute h-5 w-5 scale-75 text-ink-600 opacity-0 transition-all duration-200 group-hover:scale-100 group-hover:opacity-100 group-focus-visible:scale-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
          aria-hidden="true"
        />
        <RailTooltip label="Open sidebar" />
      </button>
    );
  }

  return (
    <div className="flex items-start justify-between gap-2 px-1 pt-1">
      <div className="flex flex-col items-start gap-1">
        <Logo className="h-11" />
        <p className="whitespace-nowrap pl-1 text-[0.6875rem] font-medium text-ink-500">
          Know where your money goes
        </p>
      </div>
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Close sidebar"
          aria-expanded={true}
          title="Close sidebar"
          className="press mt-1.5 rounded-lg p-2 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
        >
          <PanelLeftClose className="h-[1.125rem] w-[1.125rem]" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

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
  /** Icon-only rail mode (desktop). The mobile drawer is always expanded. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SidebarBody = ({
  user,
  balance,
  currency,
  onLogout,
  onAddTransaction,
  onNavigate,
  collapsed = false,
  onToggleCollapse,
}: SidebarBodyProps) => (
  <div className={clsx('flex h-full flex-col gap-5', collapsed ? 'items-stretch px-3 py-4' : 'p-4')}>
    <Brand collapsed={collapsed} onToggleCollapse={onToggleCollapse} />

    {/* Balance recap in the rail: the headline figure stays visible on every
        page, not just the dashboard. Omitted when collapsed — a truncated
        figure is worse than none. */}
    {balance !== undefined && !collapsed && (
      <div className="theme-static relative overflow-hidden rounded-2xl bg-ink-900 p-4 text-white">
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

    {collapsed ? (
      <Button
        size="icon"
        onClick={onAddTransaction}
        aria-label="Add transaction"
        className="group relative mx-auto"
      >
        <Plus className="h-5 w-5" aria-hidden="true" />
        <RailTooltip label="Add transaction" />
      </Button>
    ) : (
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
    )}

    <nav className="flex-1 space-y-1" aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          aria-label={collapsed ? item.label : undefined}
          className={({ isActive }) =>
            clsx(
              'group relative flex items-center rounded-xl py-2.5 text-[0.875rem] font-semibold transition-all duration-200',
              collapsed ? 'mx-auto h-10 w-10 justify-center' : 'gap-3 px-3',
              isActive
                ? 'bg-accent-50 text-accent-700'
                : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900',
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Left rail marker makes the active page unmistakable at a glance. */}
              {!collapsed && (
                <span
                  className={clsx(
                    'absolute left-0 h-5 w-[3px] rounded-r-full bg-accent-gradient transition-all duration-300',
                    isActive ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden="true"
                />
              )}
              <item.icon
                className={clsx(
                  'h-[1.125rem] w-[1.125rem] shrink-0 transition-transform duration-200',
                  !isActive && 'group-hover:scale-110',
                )}
                aria-hidden="true"
              />
              {collapsed ? <RailTooltip label={item.label} /> : item.label}
            </>
          )}
        </NavLink>
      ))}
    </nav>

    <div className="space-y-1 border-t border-ink-100 pt-3">
      {user &&
        (collapsed ? (
          <div className="group relative mx-auto flex w-fit py-1" role="img" aria-label={user.name}>
            <Avatar name={user.name} />
            <RailTooltip label={user.name} />
          </div>
        ) : (
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2">
            <Avatar name={user.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.8125rem] font-semibold text-ink-800">{user.name}</p>
              <p className="truncate text-[0.6875rem] text-ink-500">{user.email}</p>
            </div>
          </div>
        ))}
      {collapsed ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={onLogout}
          aria-label="Sign out"
          className="group relative mx-auto flex"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <RailTooltip label="Sign out" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          fullWidth
          onClick={onLogout}
          leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
          className="justify-start"
        >
          Sign out
        </Button>
      )}
    </div>
  </div>
);

interface SidebarProps
  extends Omit<SidebarBodyProps, 'onNavigate' | 'collapsed' | 'onToggleCollapse'> {
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({
  isDrawerOpen,
  onCloseDrawer,
  isCollapsed,
  onToggleCollapse,
  ...body
}: SidebarProps) => (
  <>
    <aside
      className={clsx(
        'relative z-40 hidden shrink-0 border-r border-ink-200/70 bg-surface transition-[width] duration-300 ease-out motion-reduce:transition-none lg:block',
        isCollapsed ? 'w-[4.5rem]' : 'w-[17rem]',
      )}
    >
      {/* Collapsed: overflow must stay visible so rail tooltips can escape the
          72px column. Expanded: clip so content doesn't spill mid-animation. */}
      <div
        className={clsx(
          'sticky top-0 h-screen',
          isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden',
        )}
      >
        {/* Fixed-width inner column: during the width transition the content is
            clipped/revealed rather than reflowed, so labels never wrap mid-slide. */}
        <div className={clsx('h-full', isCollapsed ? 'w-[4.5rem]' : 'w-[17rem]')}>
          <SidebarBody {...body} collapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />
        </div>
      </div>
    </aside>

    {isDrawerOpen && (
      <div className="fixed inset-0 z-50 lg:hidden">
        <div
          className="theme-static absolute inset-0 animate-fade-in bg-ink-950/50 backdrop-blur-sm"
          onClick={onCloseDrawer}
          aria-hidden="true"
        />
        <div className="relative h-full w-[17rem] max-w-[86%] animate-reveal-up overflow-y-auto bg-surface shadow-float">
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
  <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-ink-200/70 bg-surface/85 px-4 py-3 backdrop-blur-xl lg:hidden">
    <button
      type="button"
      onClick={onOpenDrawer}
      className="press rounded-xl border border-ink-200 bg-surface p-2 text-ink-600 shadow-subtle transition hover:bg-ink-50"
      aria-label="Open navigation"
    >
      <Menu className="h-4 w-4" aria-hidden="true" />
    </button>
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-[0.9375rem] font-bold tracking-tight text-ink-900">{title}</h1>
      {subtitle && <p className="truncate text-[0.6875rem] text-ink-500">{subtitle}</p>}
    </div>
    <ThemeToggle />
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
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200/70 bg-surface/90 pb-safe backdrop-blur-xl lg:hidden"
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
