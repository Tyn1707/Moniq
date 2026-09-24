import type { ReactNode } from 'react';

/**
 * Page header. Extracted so every screen shares one rhythm — eyebrow, title,
 * description on the left, primary action on the right — instead of each page
 * inventing its own spacing.
 *
 * Hidden on mobile, where `Topbar` already shows the title and repeating it would
 * waste the top of a small screen.
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
  <header className="mb-6 hidden flex-wrap items-end justify-between gap-4 lg:flex">
    <div className="min-w-0 space-y-1">
      {eyebrow && <p className="label-eyebrow">{eyebrow}</p>}
      <h1 className="text-display-sm text-ink-900">{title}</h1>
      {description && <p className="text-[0.875rem] text-ink-500">{description}</p>}
    </div>
    {action}
  </header>
);
