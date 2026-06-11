import { useMemo } from "react";
import { useCatalogRefresh, useInstalledPackages } from "@/hooks/usePackages";
import { VirtualizedAppGrid } from "@/components/apps/VirtualizedAppGrid";
import { AppGridSkeleton, PageHeaderSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { useSearchStore } from "@/store/searchStore";
import { useSortStore } from "@/store/sortStore";
import { useRecentlyInstalled } from "@/hooks/usePackages";
import { AppCard } from "@/components/apps/AppCard";
import { Badge } from "@/components/ui/badge";
import { filterPackages } from "@/utils/filterPackages";
import { sortPackages } from "@/utils/sortPackages";
import type { WingetPackage } from "@/types/package";

/** Small horizontal scroll rail for recently installed / featured packages */
function PackageRail({
  title,
  packages,
  installedIds,
}: {
  title: string;
  packages: WingetPackage[];
  installedIds: Set<string>;
}) {
  if (!packages.length) return null;
  return (
    <section className="space-y-2.5">
      <h2 className="text-[13px] font-semibold tracking-tight text-muted-foreground uppercase tracking-widest">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-1 pr-1 scrollbar-thin">
        {packages.slice(0, 8).map((pkg) => (
          <div key={pkg.id} className="w-[220px] shrink-0">
            <AppCard pkg={pkg} installedIds={installedIds} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomePage() {
  const query = useSearchStore((s) => s.query);
  const sort = useSortStore((s) => s.sort);
  const { data: catalog, isLoading, error, refetch } = useCatalogRefresh();
  const { data: installed } = useInstalledPackages();
  const { data: recentIds } = useRecentlyInstalled();

  const installedIds = useMemo(
    () => new Set(installed?.map((p) => p.id) ?? []),
    [installed],
  );

  const filtered = useMemo(
    () => sortPackages(filterPackages(catalog ?? [], query), sort),
    [catalog, query, sort],
  );

  // Recently installed packages resolved from catalog
  const recentlyInstalled = useMemo(() => {
    if (!recentIds?.length || !catalog) return [];
    const byId = new Map(catalog.map((p) => [p.id, p]));
    return recentIds
      .map((id) => byId.get(id))
      .filter(Boolean) as WingetPackage[];
  }, [recentIds, catalog]);

  // Featured: first 8 packages with descriptions (richer display)
  const featured = useMemo(() => {
    if (!catalog) return [];
    return catalog.filter((p) => p.description).slice(0, 8);
  }, [catalog]);

  // Discover grid: always sorted by the global sort key
  const sortedCatalog = useMemo(
    () => sortPackages(catalog ?? [], sort),
    [catalog, sort],
  );

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-6">
        <PageHeaderSkeleton />
        <AppGridSkeleton />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={String(error)} onRetry={() => refetch()} />;
  }

  // Search results mode
  if (query) {
    return (
      <div className="flex h-full flex-col gap-4 overflow-hidden">
        <div className="flex items-center gap-3">
          <h1 className="text-base font-semibold tracking-tight">Results</h1>
          <Badge variant="secondary">{filtered.length}</Badge>
          <span className="text-sm text-muted-foreground">
            for &ldquo;{query}&rdquo;
          </span>
        </div>
        <div className="min-h-0 flex-1">
          <VirtualizedAppGrid
            packages={filtered}
            installedIds={installedIds}
            emptyTitle="No matching apps"
            emptyDescription="Try different keywords, publisher names, or tags."
          />
        </div>
      </div>
    );
  }

  // Discover mode
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto pr-3 pb-6">
      <PageHeader
        title="Discover"
        description={`${(catalog?.length ?? 0).toLocaleString()} packages available`}
      />

      {/* Recently installed rail */}
      {recentlyInstalled.length > 0 && (
        <PackageRail
          title="Recently installed"
          packages={recentlyInstalled}
          installedIds={installedIds}
        />
      )}

      {/* Featured / highlighted rail */}
      {featured.length > 0 && !recentlyInstalled.length && (
        <PackageRail
          title="Popular this week"
          packages={featured}
          installedIds={installedIds}
        />
      )}

      {/* Full catalog grid */}
      <section className="flex min-h-0 flex-1 flex-col gap-2.5">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-muted-foreground">
          All packages
        </h2>
        <div className="min-h-0 flex-1">
          <VirtualizedAppGrid
            packages={sortedCatalog}
            installedIds={installedIds}
            emptyTitle="No packages found"
            emptyDescription="The catalog appears empty. Check your winget connection and try again."
          />
        </div>
      </section>
    </div>
  );
}
