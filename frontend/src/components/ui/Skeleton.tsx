import { clsx } from '../../utils/format';

interface SkeletonProps {
  className?: string;
  lines?: number;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={clsx(
      'animate-pulse rounded bg-[var(--surface-overlay)]',
      className
    )} />
  );
}

export function CardSkeleton() {
  return (
    <div className="card p-5 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-7 w-7 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

export function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3.5">
      <Skeleton className="w-5 h-5 rounded-full shrink-0" />
      <Skeleton className="w-8 h-8 rounded-xl shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
      {/* Budget bar skeleton */}
      <div className="card p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-3 w-full rounded-full" />
      </div>
      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-4">
        {[0,1,2].map(i => <CardSkeleton key={i} />)}
      </div>
      {/* Recent list */}
      <div className="card">
        <div className="px-5 py-4 border-b border-[var(--border)]">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="px-2 py-2 space-y-1">
          {[0,1,2,3,4].map(i => <TransactionSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
