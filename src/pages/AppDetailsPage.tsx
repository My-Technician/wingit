import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Heart,
  ExternalLink,
  Trash2,
  RefreshCw,
  Loader2,
  Globe,
  Scale,
  User,
  Tag,
  CalendarDays,
  Building2,
  ShieldCheck,
  LifeBuoy,
} from "lucide-react";
import {
  usePackageDetails,
  useInstalledPackages,
  useUpgrades,
} from "@/hooks/usePackages";
import { AppIcon } from "@/components/apps/AppIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppDetailSkeleton } from "@/components/common/AppDetailSkeleton";
import { ErrorState } from "@/components/common/ErrorState";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useInstallQueueStore } from "@/store/installQueueStore";
import { api } from "@/services/api";
import type { WingetPackage } from "@/types/package";
import { displayPublisher } from "@/utils/publisher";
import { cn } from "@/utils/cn";

function MetaRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  href?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate text-sm text-primary hover:underline"
          >
            {value}
          </a>
        ) : (
          <p className="truncate text-sm font-medium">{value}</p>
        )}
      </div>
    </div>
  );
}

export function AppDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const packageId = decodeURIComponent(id ?? "");
  const catalogPkg = (location.state as { pkg?: WingetPackage } | null)?.pkg;
  const { data: fetchedPkg, isLoading, error, refetch } = usePackageDetails(packageId);
  // Merge: show catalog data immediately, overlay rich fields once show_package returns
  const pkg: WingetPackage | undefined = fetchedPkg
    ? { ...(catalogPkg ?? {}), ...fetchedPkg } as WingetPackage
    : (catalogPkg?.id === packageId ? catalogPkg : undefined);
  // True when we have thin catalog data but are still waiting for rich details
  const loadingDetails = isLoading && !!catalogPkg && !fetchedPkg;
  const { data: installed } = useInstalledPackages();
  const { data: upgrades } = useUpgrades();
  const isFavorite = useFavoritesStore((s) => s.ids.has(packageId));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const enqueue = useInstallQueueStore((s) => s.enqueue);
  const queryClient = useQueryClient();
  const [showUninstallConfirm, setShowUninstallConfirm] = useState(false);

  const isInstalled = installed?.some((p) => p.id === packageId);
  const hasUpdate = upgrades?.some((p) => p.id === packageId);

  const uninstall = useMutation({
    mutationFn: () =>
      api.uninstallPackage({ id: packageId, name: pkg?.name }),
    onSuccess: () => {
      toast.success(`${pkg?.name || "App"} uninstalled`);
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  const upgrade = useMutation({
    mutationFn: () => api.upgradePackage(packageId),
    onSuccess: () => {
      toast.success(`${pkg?.name || "App"} updated`);
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  if (isLoading && !pkg) return <AppDetailSkeleton />;
  if (!pkg && (error || !isLoading)) {
    return (
      <ErrorState
        message={String(error ?? "Package not found")}
        onRetry={() => refetch()}
      />
    );
  }
  if (!pkg) return <AppDetailSkeleton />;

  // Determine which tabs to show
  const hasDetails = !!(
    pkg.license ||
    pkg.author ||
    pkg.publisherUrl ||
    pkg.supportUrl ||
    pkg.privacyUrl ||
    pkg.moniker ||
    pkg.releaseDate
  );
  const hasReleaseNotes = !!pkg.releaseNotes;
  const showTabs = hasDetails || hasReleaseNotes;

  return (
    <div className="mx-auto h-full max-w-3xl overflow-y-auto pr-3 pb-10">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className={cn(
          "mb-5 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5",
          "text-sm text-muted-foreground transition-colors duration-[140ms]",
          "hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "active:scale-[0.97]",
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Hero card */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex gap-5">
          <AppIcon
            packageId={pkg.id}
            name={pkg.name}
            website={pkg.homepage}
            className="h-16 w-16 shrink-0 rounded-xl"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2">
              <h1 className="text-xl font-bold tracking-tight leading-tight">
                {pkg.name}
              </h1>
              {pkg.source && (
                <Badge variant="secondary" className="mt-0.5 shrink-0">
                  {pkg.source}
                </Badge>
              )}
              {isInstalled && (
                <Badge variant="success" className="mt-0.5 shrink-0">
                  Installed
                </Badge>
              )}
              {hasUpdate && (
                <Badge variant="warning" className="mt-0.5 shrink-0">
                  Update available
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {displayPublisher(pkg)}
            </p>
            {loadingDetails && (
              <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground/70">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading details…
              </p>
            )}
            {pkg.version && (
              <p className="mt-0.5 font-mono text-xs tabular-nums text-muted-foreground">
                {pkg.version}
                {hasUpdate && pkg.availableVersion && (
                  <>
                    <span className="mx-1.5 opacity-40">to</span>
                    <span className="text-foreground">{pkg.availableVersion}</span>
                  </>
                )}
              </p>
            )}

            {/* Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {!isInstalled ? (
                <Button
                  onClick={() => enqueue(pkg.id, pkg.name)}
                  className="active:scale-[0.97]"
                >
                  <Download className="h-4 w-4" />
                  Install
                </Button>
              ) : (
                <>
                  {hasUpdate && (
                    <Button
                      onClick={() => upgrade.mutate()}
                      disabled={upgrade.isPending}
                      className="active:scale-[0.97]"
                    >
                      {upgrade.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Update
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    variant="destructive"
                    onClick={() => setShowUninstallConfirm(true)}
                    disabled={uninstall.isPending}
                    className="active:scale-[0.97]"
                  >
                    {uninstall.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Removing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4" />
                        Uninstall
                      </>
                    )}
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => toggleFavorite(pkg.id)}
                className="active:scale-[0.97]"
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    isFavorite && "fill-destructive text-destructive",
                  )}
                />
                {isFavorite ? "Favorited" : "Favorite"}
              </Button>
              {pkg.homepage && (
                <Button
                  variant="outline"
                  onClick={() => window.open(pkg.homepage, "_blank")}
                  className="active:scale-[0.97]"
                >
                  <ExternalLink className="h-4 w-4" />
                  Website
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content tabs */}
      <div className="mt-5">
        {showTabs ? (
          <TabsRoot defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              {hasDetails && <TabsTrigger value="details">Details</TabsTrigger>}
              {hasReleaseNotes && (
                <TabsTrigger value="release-notes">Release notes</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab pkg={pkg} />
            </TabsContent>

            {hasDetails && (
              <TabsContent value="details">
                <DetailsTab pkg={pkg} />
              </TabsContent>
            )}

            {hasReleaseNotes && (
              <TabsContent value="release-notes">
                <div className="rounded-xl border border-border bg-card p-5">
                  <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
                    {pkg.releaseNotes}
                  </pre>
                </div>
              </TabsContent>
            )}
          </TabsRoot>
        ) : (
          <OverviewTab pkg={pkg} />
        )}
      </div>

      <ConfirmDialog
        open={showUninstallConfirm}
        onOpenChange={setShowUninstallConfirm}
        title={`Uninstall ${pkg.name}?`}
        description="This will remove the app from your system. You can reinstall it anytime."
        confirmLabel="Uninstall"
        variant="destructive"
        onConfirm={() => {
          uninstall.mutate();
          setShowUninstallConfirm(false);
        }}
      />
    </div>
  );
}

function OverviewTab({ pkg }: { pkg: WingetPackage }) {
  return (
    <div className="space-y-4">
      {/* Description */}
      {pkg.description && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2.5 text-sm font-semibold tracking-tight">Description</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {pkg.description}
          </p>
        </section>
      )}

      {/* Tags */}
      {pkg.tags && pkg.tags.length > 0 && (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold tracking-tight">Tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {pkg.tags.map((tag, i) => (
              <Badge key={`${tag}-${i}`} variant="secondary">
                <Tag className="mr-1 h-3 w-3" />
                {tag}
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Package ID */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-2.5 text-sm font-semibold tracking-tight">Package ID</h2>
        <code className="font-mono text-sm text-muted-foreground">{pkg.id}</code>
        {pkg.moniker && (
          <p className="mt-1 text-xs text-muted-foreground">
            Moniker: <code className="font-mono">{pkg.moniker}</code>
          </p>
        )}
      </section>
    </div>
  );
}

function DetailsTab({ pkg }: { pkg: WingetPackage }) {
  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border">
      {pkg.author && (
        <div className="px-5">
          <MetaRow icon={User} label="Author" value={pkg.author} />
        </div>
      )}
      {pkg.license && (
        <div className="px-5">
          <MetaRow
            icon={Scale}
            label="License"
            value={pkg.license}
            href={pkg.licenseUrl}
          />
        </div>
      )}
      {pkg.releaseDate && (
        <div className="px-5">
          <MetaRow icon={CalendarDays} label="Release date" value={pkg.releaseDate} />
        </div>
      )}
      {pkg.publisherUrl && (
        <div className="px-5">
          <MetaRow
            icon={Building2}
            label="Publisher website"
            value={pkg.publisherUrl}
            href={pkg.publisherUrl}
          />
        </div>
      )}
      {pkg.supportUrl && (
        <div className="px-5">
          <MetaRow
            icon={LifeBuoy}
            label="Support"
            value={pkg.supportUrl}
            href={pkg.supportUrl}
          />
        </div>
      )}
      {pkg.privacyUrl && (
        <div className="px-5">
          <MetaRow
            icon={ShieldCheck}
            label="Privacy policy"
            value={pkg.privacyUrl}
            href={pkg.privacyUrl}
          />
        </div>
      )}
      {pkg.homepage && (
        <div className="px-5">
          <MetaRow
            icon={Globe}
            label="Homepage"
            value={pkg.homepage}
            href={pkg.homepage}
          />
        </div>
      )}
    </div>
  );
}
