import { BarChart3, LayoutDashboard, PiggyBank, Receipt, UserCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Single source of truth for navigation (brief §27), used by both navs. */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

/** Page titles for the mobile topbar, keyed by route path. */
export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/analytics': 'Analytics',
  '/profile': 'Profile',
};
