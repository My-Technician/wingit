import { Heart, Download, Check, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/apps/AppIcon";
import { HighlightText } from "@/components/common/HighlightText";
import { cn } from "@/utils/cn";
import { displayPublisher } from "@/utils/publisher";
import type { WingetPackage } from "@/types/package";
import { useFavoritesStore } from "@/store/favoritesStore";
import { useInstallQueueStore } from "@/store/installQueueStore";
import { useSearchStore } from "@/store/searchStore";

interface AppCardProps {
  pkg: WingetPackage;
  installedIds?: Set<string>;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}

export function AppCard({
  pkg,
  installedIds,
  selectable,
  selected,
  onToggleSelect,
}: AppCardProps) {
  const navigate = useNavigate();
  const query = useSearchStore((s) => s.query);
  const isFavorite = useFavoritesStore((s) => s.ids.has(pkg.id));
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const enqueue = useInstallQueueStore((s) => s.enqueue);
  const job = useInstallQueueStore((s) =>
    s.jobs.find((j) => j.packageId === pkg.id),
  );

  const installed = installedIds?.has(pkg.id) ?? pkg.installed;
  const isInstalling = job?.status === "running" || job?.status === "queued";

  const handleNavigate = () =>
    navigate(`/app/${encodeURIComponent(pkg.id)}`, { state: { pkg } });

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-lg border border-border bg-card p-4",
        "transition-[border-color,box-shadow] duration-[140ms] ease-out",
        "hover:border-border hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
        "dark:hover:shadow-[0_2px_8px_rgba(0,0,0,0.18)]",
        selected &&
          "ring-2 ring-primary ring-offset-1 ring-offset-background",
      )}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="absolute right-3 top-3 h-4 w-4 cursor-pointer rounded border-border accent-primary"
          aria-label={`Select ${pkg.name}`}
        />
      )}

      {/* Clickable content region */}
      <div
        role="link"
        tabIndex={0}
        onClick={handleNavigate}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleNavigate();
          }
        }}
        className="flex flex-1 cursor-pointer flex-col gap-3 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
      >
        <div className="flex items-start gap-3">
          <AppIcon
            packageId={pkg.id}
            name={pkg.name}
            website={pkg.homepage}
            className="h-10 w-10 shrink-0 rounded-lg"
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className="truncate text-sm font-semibold leading-tight tracking-tight">
              <HighlightText text={pkg.name} query={query} />
            </h3>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <HighlightText text={displayPublisher(pkg)} query={query} />
            </p>
          </div>
        </div>

        <p className="line-clamp-2 min-h-[32px] text-xs leading-relaxed text-muted-foreground">
          {pkg.description || "No description available."}
        </p>
      </div>

      {/* Footer action row */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
        <span
          className="max-w-[120px] truncate font-mono text-[10px] text-muted-foreground/40"
          title={pkg.id}
        >
          {pkg.id}
        </span>
        <div className="flex items-center gap-1">
          {/* Favorite — only visible on hover/focus */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 shrink-0 transition-opacity duration-[140ms]",
              isFavorite
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            )}
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(pkg.id);
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart
              className={cn(
                "h-3.5 w-3.5",
                isFavorite
                  ? "fill-destructive text-destructive"
                  : "text-muted-foreground",
              )}
            />
          </Button>

          {/* Install button */}
          <Button
            size="sm"
            variant={installed ? "secondary" : "default"}
            className="h-7 min-w-[80px] rounded-md px-2.5 text-xs active:scale-[0.97]"
            disabled={installed || isInstalling}
            onClick={(e) => {
              e.stopPropagation();
              enqueue(pkg.id, pkg.name);
            }}
          >
            {isInstalling ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Installing
              </>
            ) : installed ? (
              <>
                <Check className="h-3 w-3" />
                Installed
              </>
            ) : (
              <>
                <Download className="h-3 w-3" />
                Install
              </>
            )}
          </Button>
        </div>
      </div>
    </article>
  );
}
