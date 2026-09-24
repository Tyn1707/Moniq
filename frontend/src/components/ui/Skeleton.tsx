import clsx from 'clsx';

/**
 * Loading skeletons (brief §30).
 *
 * Each skeleton mirrors the layout of the content it replaces, so the page does
 * not jump when real data arrives. The whole group is marked `aria-busy` and
 * hidden from the accessibility tree — a screen reader gets the "Loading" status
 * instead of a tree of meaningless boxes.
 */

export const Skeleton = ({ className }: { className?: string }) => (
  <div className={clsx('skeleton', className)} />
);

const LoadingRegion = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <>
    <span className="sr-only" role="status">
      {label}
    </span>
    <div aria-hidden="true" aria-busy="true">
      {children}
    </div>
  </>
);

export const SummaryCardsSkeleton = () => (
  <LoadingRegion label="Loading summary">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="card space-y-3 p-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export const ChartSkeleton = ({ height = 'h-72' }: { height?: string }) => (
  <LoadingRegion label="Loading chart">
    <div className="card space-y-4 p-5">
      <Skeleton className="h-5 w-40" />
      <Skeleton className={clsx('w-full', height)} />
    </div>
  </LoadingRegion>
);

export const TransactionListSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <LoadingRegion label="Loading transactions">
    <div className="card divide-y divide-slate-100">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-4 p-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-5 w-24" />
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export const BudgetListSkeleton = ({ rows = 3 }: { rows?: number }) => (
  <LoadingRegion label="Loading budgets">
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      ))}
    </div>
  </LoadingRegion>
);

export const DashboardSkeleton = () => (
  <div className="space-y-6">
    <SummaryCardsSkeleton />
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <ChartSkeleton />
      </div>
      <ChartSkeleton />
    </div>
    <TransactionListSkeleton />
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="space-y-6">
    <SummaryCardsSkeleton />
    <ChartSkeleton />
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChartSkeleton height="h-64" />
      <ChartSkeleton height="h-64" />
    </div>
  </div>
);

export const PageHeaderSkeleton = () => (
  <LoadingRegion label="Loading">
    <div className="space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72" />
    </div>
  </LoadingRegion>
);
