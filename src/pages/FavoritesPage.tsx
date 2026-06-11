import { useEffect, useMemo } from "react";
import { Heart } from "lucide-react";
import { useCatalogRefresh, useInstalledPackages } from "@/hooks/usePackages";
import { VirtualizedAppGrid } from "@/components/apps/VirtualizedAppGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { AppGridSkeleton } from "@/components/common/LoadingSkeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { useFavoritesStore } from "@/store/favoritesStore";

export function FavoritesPage() {
  const { ids, load, loaded } = useFavoritesStore();
  const { data: catalog, isLoading } = useCatalogRefresh();
  const { data: installed } = useInstalledPackages();

  useEffect(() => {
    load();
  }, [load]);

  const favorites = useMemo(
    () => (catalog ?? []).filter((p) => ids.has(p.id)),
    [catalog, ids],
  );

  const installedIds = useMemo(
    () => new Set(installed?.map((p) => p.id) ?? []),
    [installed],
  );

  if (!loaded || isLoading) return <AppGridSkeleton />;

  if (favorites.length === 0)
    return (
      <EmptyState
        icon={Heart}
        title="No favorites yet"
        description="Click the heart icon on any app card to save it here."
      />
    );

  return (
    <div className="flex h-full flex-col gap-5 overflow-hidden">
      <PageHeader
        title="Favorites"
        description={`${favorites.length} saved app${favorites.length === 1 ? "" : "s"}`}
      />
      <div className="min-h-0 flex-1">
        <VirtualizedAppGrid packages={favorites} installedIds={installedIds} />
      </div>
    </div>
  );
}
