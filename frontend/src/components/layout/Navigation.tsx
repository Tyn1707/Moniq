import { NavLink } from 'react-router-dom';
import { LogOut, Menu, Plus, Wallet, X } from 'lucide-react';
import clsx from 'clsx';
import { NAV_ITEMS } from './navItems';
import { Button } from '../ui/Button';
import type { User } from '../../types';

/**
 * Navigation chrome.
 *
 * Desktop gets a persistent sidebar; mobile gets a fixed bottom bar plus a
 * slide-over drawer (brief §27). Both render the same `NAV_ITEMS`, so a new page
 * appears in every navigation surface at once.
 */

const Brand = () => (
  <div className="flex items-center gap-2.5">
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white">
      <Wallet className="h-5 w-5" aria-hidden="true" />
    </span>
    <div className="leading-tight">
      <p className="text-sm font-semibold text-slate-900">FinanceTrack</p>
      <p className="text-xs text-slate-500">Know where your money goes</p>
    </div>
  </div>
);

const navLinkClasses = ({ isActive }: { isActive: boolean }): string =>
  clsx(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
    isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 hover:bg-slate-100',
  );

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  onAddTransaction: () => void;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
}

const SidebarContent = ({
  user,
  onLogout,
  onAddTransaction,
  onNavigate,
}: {
  user: User | null;
  onLogout: () => void;
  onAddTransaction: () => void;
  onNavigate?: () => void;
}) => (
  <div className="flex h-full flex-col gap-6 p-4">
    <Brand />

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
        <NavLink key={item.to} to={item.to} className={navLinkClasses} onClick={onNavigate}>
          <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
          {item.label}
        </NavLink>
      ))}
    </nav>

    <div className="space-y-3 border-t border-slate-100 pt-4">
      {user && (
        <div className="min-w-0 px-1">
          <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
          <p className="truncate text-xs text-slate-500">{user.email}</p>
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

export const Sidebar = ({
  user,
  onLogout,
  onAddTransaction,
  isDrawerOpen,
  onCloseDrawer,
}: SidebarProps) => (
  <>
    {/* Desktop: always present. */}
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent user={user} onLogout={onLogout} onAddTransaction={onAddTransaction} />
      </div>
    </aside>

    {/* Mobile / tablet: slide-over drawer. */}
    {isDrawerOpen && (
      <div className="fixed inset-0 z-40 lg:hidden">
        <div
          className="absolute inset-0 bg-slate-900/50"
          onClick={onCloseDrawer}
          aria-hidden="true"
        />
        <div className="relative h-full w-72 max-w-[85%] bg-white shadow-xl">
          <button
            type="button"
            onClick={onCloseDrawer}
            className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          <SidebarContent
            user={user}
            onLogout={onLogout}
            onAddTransaction={onAddTransaction}
            onNavigate={onCloseDrawer}
          />
        </div>
      </div>
    )}
  </>
);

// ---------------------------------------------------------------------------

export const Topbar = ({
  title,
  onOpenDrawer,
  onAddTransaction,
}: {
  title: string;
  onOpenDrawer: () => void;
  onAddTransaction: () => void;
}) => (
  <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
    <button
      type="button"
      onClick={onOpenDrawer}
      className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100"
      aria-label="Open navigation"
    >
      <Menu className="h-5 w-5" aria-hidden="true" />
    </button>
    <h1 className="flex-1 truncate text-base font-semibold text-slate-900">{title}</h1>
    <Button size="sm" onClick={onAddTransaction} aria-label="Add transaction">
      <Plus className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">Add</span>
    </Button>
  </header>
);

// ---------------------------------------------------------------------------

export const BottomNav = () => (
  <nav
    className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden"
    aria-label="Main navigation"
  >
    <ul className="flex">
      {NAV_ITEMS.map((item) => (
        <li key={item.to} className="flex-1">
          <NavLink
            to={item.to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition',
                isActive ? 'text-primary-700' : 'text-slate-500',
              )
            }
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
);
