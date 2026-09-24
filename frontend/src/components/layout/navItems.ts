import { LayoutDashboard, PieChart, PiggyBank, Receipt, UserCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/** Single source of truth for navigation (brief §27), used by every nav surface. */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { to: '/transactions', label: 'Activity', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: PiggyBank },
  { to: '/analytics', label: 'Insights', icon: PieChart },
  { to: '/profile', label: 'Profile', icon: UserCircle },
];

/** Titles for the mobile topbar, keyed by route path. */
export const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/analytics': 'Analytics',
  '/profile': 'Profile',
};

export const PAGE_SUBTITLES: Record<string, string> = {
  '/dashboard': 'Your money at a glance',
  '/transactions': 'Search and manage your history',
  '/budgets': 'Track spending against limits',
  '/analytics': 'Patterns and insights',
  '/profile': 'Account and preferences',
};
