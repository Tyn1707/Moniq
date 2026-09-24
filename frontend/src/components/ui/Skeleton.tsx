import type { CSSProperties, ReactNode } from 'react';
import clsx from 'clsx';

/**
 * Loading skeletons (brief §30).
 *
 * Each skeleton mirrors the geometry of the content it stands in for, so nothing
 * shifts when real data lands. The group is hidden from the accessibility tree
 * and paired with a single live "Loading…" status — a screen reader should hear
 * one message, not a tree of empty boxes.
 */

export const Skeleton = ({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) => <div className={clsx('skeleton', className)} style={style} />;

const LoadingRegion = ({ label, children }: { label: string; children: ReactNode }) => (
  <>
    <span className="sr-only" role="status">
      {label}
    </span>
    <div aria-hidden="true" aria-busy="true">
      {children}
    </div>
  </>
);

export const BalanceHeroSkeleton = () => (
  <LoadingRegion label="Loading balance">
    <div className="relative overflow-hidden rounded-3xl bg-ink-800 p-6 sm:p-8">
      <div className="space-y-4">
        <Skeleton className="h-3 w-28 bg-white/15" />
        <Skeleton className="h-12 w-64 bg-white/20" />
        <Skeleton className="h-3 w-44 bg-white/10" />
      </div>
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3 w-16 bg-white/10" />
            <Skeleton className="h-5 w-24 bg-white/15" />
          </div>
        ))}
      </div>
    </div>
  </LoadingRegion>
);

export const StatTilesSkeleton = ({ count = 3 }: { count?: number }) => (
  <LoadingRegion label="Loading summary">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="surface space-y-3 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export const ChartSkeleton = ({ height = 'h-64' }: { height?: string }) => (
  <LoadingRegion label="Loading chart">
    <div className="surface space-y-5 p-5 sm:p-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      {/* Staggered bar heights read as a chart rather than a grey block. */}
      <div className={clsx('flex items-end gap-2.5', height)}>
        {[45, 70, 35, 85, 55, 95, 60, 40].map((percent, index) => (
          <Skeleton key={index} className="flex-1 rounded-t-lg" style={{ height: `${percent}%` }} />
        ))}
      </div>
    </div>
  </LoadingRegion>
);

export const DonutSkeleton = () => (
  <LoadingRegion label="Loading breakdown">
    <div className="surface space-y-5 p-5 sm:p-6">
      <Skeleton className="h-4 w-40" />
      <div className="flex justify-center py-2">
        <Skeleton className="h-40 w-40 rounded-full" />
      </div>
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3">
            <Skeleton className="h-2.5 w-2.5 rounded-full" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  </LoadingRegion>
);

export const TransactionListSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <LoadingRegion label="Loading transactions">
    <div className="divide-y divide-ink-100">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 px-5 py-4 sm:px-6">
          <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/3" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export const BudgetListSkeleton = ({ rows = 4 }: { rows?: number }) => (
  <LoadingRegion label="Loading budgets">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="surface flex items-center gap-5 p-5">
          <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export const InsightsSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <LoadingRegion label="Loading insights">
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex gap-3 rounded-2xl border border-ink-200/70 p-4">
          <Skeleton className="h-9 w-9 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <BalanceHeroSkeleton />
    <StatTilesSkeleton />
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
      <div className="xl:col-span-3">
        <ChartSkeleton />
      </div>
      <div className="xl:col-span-2">
        <DonutSkeleton />
      </div>
    </div>
    <div className="surface overflow-hidden">
      <TransactionListSkeleton />
    </div>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="space-y-6">
    <StatTilesSkeleton count={4} />
    <ChartSkeleton height="h-72" />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <DonutSkeleton />
      <div className="surface p-5 sm:p-6">
        <InsightsSkeleton />
      </div>
    </div>
  </div>
);
