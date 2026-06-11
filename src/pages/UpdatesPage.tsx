import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useUpgrades } from "@/hooks/usePackages";
import { AppListSkeleton } from "@/components/common/LoadingSkeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { AppListRow } from "@/components/apps/AppListRow";
import { Button } from "@/components/ui/button";
import { useSearchStore } from "@/store/searchStore";
import { useSortStore } from "@/store/sortStore";
import { filterPackages } from "@/utils/filterPackages";
import { sortPackages } from "@/utils/sortPackages";
import { api } from "@/services/api";

export function UpdatesPage() {
  const { data, isLoading, error, refetch } = useUpgrades();
  const queryClient = useQueryClient();
  const query = useSearchStore((s) => s.query);
  const sort = useSortStore((s) => s.sort);
  const filtered = useMemo(
    () => sortPackages(filterPackages(data ?? [], query), sort),
    [data, query, sort],
  );
  const [upgradingId, setUpgradingId] = useState<string | null>(null);
  const [showUpdateAllConfirm, setShowUpdateAllConfirm] = useState(false);

  const upgradeOne = useMutation({
    mutationFn: (id: string) => {
      setUpgradingId(id);
      return api.upgradePackage(id);
    },
    onSuccess: (_, id) => {
      setUpgradingId(null);
      const pkgName = data?.find((p) => p.id === id)?.name || id;
      toast.success(`${pkgName} updated`);
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e) => {
      setUpgradingId(null);
      toast.error(String(e));
    },
  });

  const upgradeAll = useMutation({
    mutationFn: () => {
      toast.info("Updating all apps...");
      return api.upgradePackage();
    },
    onSuccess: () => {
      toast.success("All apps updated");
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading) return <AppListSkeleton />;
  if (error) return <ErrorState message={String(error)} onRetry={() => refetch()} />;
  if (!data?.length)
    return (
      <EmptyState
        icon={RefreshCw}
        title="Everything is up to date"
        description="No updates available for your installed apps."
      />
    );

  return (
    <div className="flex h-full flex-col gap-5 overflow-y-auto pr-3 pb-4">
      <PageHeader
        title="Updates"
        description={`${data.length} update${data.length === 1 ? "" : "s"} available`}
        action={
          <Button
            onClick={() => setShowUpdateAllConfirm(true)}
            disabled={upgradeAll.isPending}
            className="active:scale-[0.97]"
          >
            <RefreshCw className="h-4 w-4" />
            Update all
          </Button>
        }
      />
      {filtered.length === 0 && query ? (
        <EmptyState
          icon={RefreshCw}
          title="No matching updates"
          description={`No pending updates match "${query}".`}
        />
      ) : (
      <div className="space-y-1.5">
        {filtered.map((pkg, index) => (
          <AppListRow
            key={`${pkg.id}-${pkg.version ?? "unknown"}-${index}`}
            pkg={pkg}
            variant="update"
            isLoading={upgradingId === pkg.id}
            onAction={() => upgradeOne.mutate(pkg.id)}
          />
        ))}
      </div>
      )}

      <ConfirmDialog
        open={showUpdateAllConfirm}
        onOpenChange={setShowUpdateAllConfirm}
        title="Update all apps?"
        description={`This will update ${data.length} app${data.length === 1 ? "" : "s"} to their latest versions. This may take a while.`}
        confirmLabel="Update all"
        onConfirm={() => upgradeAll.mutate()}
        loading={upgradeAll.isPending}
      />
    </div>
  );
}
