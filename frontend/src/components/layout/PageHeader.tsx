import type { ReactNode } from 'react';
import { ThemeToggle } from '../ui/ThemeToggle';

/**
 * Page header. Extracted so every screen shares one rhythm — eyebrow, title,
 * description on the left, primary action on the right — instead of each page
 * inventing its own spacing. The theme switch sits in the top-right corner,
 * above the page action.
 *
 * Hidden on mobile, where `Topbar` already shows the title (and its own theme
 * switch) and repeating it would waste the top of a small screen.
 */
export const PageHeader = ({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}) => (
  <header className="mb-6 hidden items-stretch justify-between gap-4 lg:flex">
    <div className="min-w-0 space-y-1 self-end">
      {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
      <h1 className="text-display-sm text-ink-900">{title}</h1>
      {description && <p className="text-[0.875rem] text-ink-500">{description}</p>}
    </div>
    <div className="flex shrink-0 flex-col items-end justify-between gap-3">
      <ThemeToggle />
      {action}
    </div>
  </header>
);
