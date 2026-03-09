import { KpiCardSkeleton, TableSkeleton, CardSkeleton } from '@/components/ui/skeleton';

// ── Generic page-level loading shells ────────────────────────────────────────

export function DashboardLoading() {
  return (
    <div className="p-6 space-y-5">
      <div className="space-y-1">
        <div className="shimmer h-6 w-40 rounded-md" />
        <div className="shimmer h-4 w-56 rounded-md" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <KpiCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <CardSkeleton className="h-64" />
        </div>
        <CardSkeleton className="h-64" />
      </div>
    </div>
  );
}

export function TablePageLoading({ title = '' }: { title?: string }) {
  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          {title
            ? <p className="text-xl font-semibold text-foreground">{title}</p>
            : <div className="shimmer h-6 w-24 rounded-md" />}
          <div className="shimmer h-4 w-32 rounded-md" />
        </div>
        <div className="shimmer h-9 w-28 rounded-md" />
      </div>
      <div className="flex gap-3">
        <div className="shimmer h-9 w-48 rounded-md" />
        <div className="shimmer h-9 w-32 rounded-md" />
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="h-11 bg-muted/50 border-b border-border" />
        <table className="w-full">
          <TableSkeleton rows={6} cols={5} />
        </table>
      </div>
    </div>
  );
}

export function SettingsLoading() {
  return (
    <div className="p-6 space-y-5 max-w-2xl">
      <div className="space-y-1">
        <div className="shimmer h-6 w-32 rounded-md" />
        <div className="shimmer h-4 w-52 rounded-md" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card h-16 shimmer" />
      ))}
    </div>
  );
}
