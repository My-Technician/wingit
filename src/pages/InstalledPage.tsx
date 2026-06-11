import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { useInstalledPackages } from "@/hooks/usePackages";
import { AppListSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AppListRow } from "@/components/apps/AppListRow";
import { useSearchStore } from "@/store/searchStore";
import { useSortStore } from "@/store/sortStore";
import { filterPackages } from "@/utils/filterPackages";
import { sortPackages } from "@/utils/sortPackages";
import { api } from "@/services/api";

export function InstalledPage() {
  const { data, isLoading, error, refetch } = useInstalledPackages();
  const queryClient = useQueryClient();
  const query = useSearchStore((s) => s.query);
  const sort = useSortStore((s) => s.sort);
  const filtered = useMemo(
    () => sortPackages(filterPackages(data ?? [], query), sort),
    [data, query, sort],
  );
  const [uninstallTarget, setUninstallTarget] = useState<{
    id: string;
    name: string;
    source?: string;
  } | null>(null);

  const uninstall = useMutation({
    mutationFn: (pkg: { id: string; name: string; source?: string }) =>
      api.uninstallPackage({ id: pkg.id, name: pkg.name, source: pkg.source }),
    onSuccess: () => {
      toast.success("App uninstalled");
      queryClient.invalidateQueries({ queryKey: ["packages", "installed"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading) return <AppListSkeleton wide />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;
  if (!data?.length)
    return (
      <EmptyState
        icon={Download}
        title="No installed apps"
        description="Browse Discover to find and install apps."
      />
    );

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-3 pb-4">
      <PageHeader
        title="Installed"
        description={`${data.length} app${data.length === 1 ? "" : "s"} on this device`}
      />
      {filtered.length === 0 && query ? (
        <EmptyState
          icon={Download}
          title="No matching apps"
          description={`No installed apps match "${query}".`}
        />
      ) : (
      <div className="space-y-1.5">
        {filtered.map((pkg, index) => (
          <AppListRow
            key={`${pkg.id}-${pkg.version ?? "unknown"}-${index}`}
            pkg={pkg}
            variant="installed"
            isLoading={uninstall.isPending && uninstallTarget?.id === pkg.id}
            onAction={() =>
              setUninstallTarget({ id: pkg.id, name: pkg.name, source: pkg.source })
            }
          />
        ))}
      </div>
      )}

      <ConfirmDialog
        open={!!uninstallTarget}
        onOpenChange={(open) => !open && setUninstallTarget(null)}
        title={`Uninstall ${uninstallTarget?.name}?`}
        description="This will remove the app from your system. You can reinstall it anytime."
        confirmLabel="Uninstall"
        variant="destructive"
        onConfirm={() => {
          if (uninstallTarget) uninstall.mutate(uninstallTarget);
          setUninstallTarget(null);
        }}
      />
    </div>
  );
}
