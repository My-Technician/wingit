/* Card-grid skeleton used by HomePage / Discover */
export function AppCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 h-10 w-10 rounded-lg skeleton-shimmer" />
      <div className="mb-2 h-4 w-3/4 rounded skeleton-shimmer" />
      <div className="mb-3 h-3 w-1/2 rounded skeleton-shimmer" />
      <div className="h-7 w-full rounded-md skeleton-shimmer" />
    </div>
  );
}

export function AppGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <AppCardSkeleton key={i} />
      ))}
    </div>
  );
}

/* Page header skeleton */
export function PageHeaderSkeleton() {
  return (
    <div className="space-y-2">
      <div className="h-8 w-48 rounded skeleton-shimmer" />
      <div className="h-4 w-72 max-w-full rounded skeleton-shimmer" />
    </div>
  );
}

/* List-row skeletond by InstalledPage / UpdatesPage */
function ListRowSkeleton({ wide }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
      <div className="h-10 w-10 shrink-0 rounded-lg skeleton-shimmer" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-44 rounded skeleton-shimmer" />
        <div className="h-3 w-28 rounded skeleton-shimmer" />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {wide && <div className="h-8 w-8 rounded-lg skeleton-shimmer" />}
        <div className={`h-8 rounded-lg skeleton-shimmer ${wide ? "w-24" : "w-20"}`} />
      </div>
    </div>
  );
}

export function AppListSkeleton({
  count = 8,
  wide = false,
}: {
  count?: number;
  wide?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pb-4">
      <PageHeaderSkeleton />
      <div className="space-y-2">
        {Array.from({ length: count }).map((_, i) => (
          <ListRowSkeleton key={i} wide={wide} />
        ))}
      </div>
    </div>
  );
}
