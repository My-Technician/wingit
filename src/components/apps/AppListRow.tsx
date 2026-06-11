import { Loader2, Trash2, RefreshCw, ExternalLink, Check } from "lucide-react";
import { AppIcon } from "@/components/apps/AppIcon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { displayPublisher } from "@/utils/publisher";
import { cn } from "@/utils/cn";
import type { WingetPackage } from "@/types/package";

/** "installed" — shows uninstall button
 *  "update" — shows current→available + update button
 *  "generic" — icon + name/publisher only, no action button
 */
export type AppListRowVariant = "installed" | "update" | "generic";

interface AppListRowProps {
  pkg: WingetPackage;
  variant?: AppListRowVariant;
  /** Whether an action is in-progress for this row */
  isLoading?: boolean;
  /** Called when user clicks primary action (uninstall / update) */
  onAction?: () => void;
  /** Called when user clicks the homepage link icon */
  onOpenHomepage?: () => void;
  className?: string;
}

export function AppListRow({
  pkg,
  variant = "installed",
  isLoading,
  onAction,
  onOpenHomepage,
  className,
}: AppListRowProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3",
        "transition-colors duration-[140ms] ease-out",
        "@media (hover: hover) { hover:bg-muted/40 }",
        className,
      )}
    >
      <AppIcon
        packageId={pkg.id}
        name={pkg.name}
        website={pkg.homepage}
        className="h-9 w-9 shrink-0 rounded-lg"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium tracking-tight">{pkg.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {variant === "update" ? (
            <>
              <span className="tabular-nums">{pkg.version ?? "?"}</span>
              <span className="mx-1.5 opacity-40">to</span>
              <span className="font-medium text-foreground tabular-nums">
                {pkg.availableVersion ?? "latest"}
              </span>
              <span className="mx-1.5 opacity-40">·</span>
              {displayPublisher(pkg)}
            </>
          ) : (
            <>
              {pkg.version && (
                <>
                  <span className="tabular-nums">{pkg.version}</span>
                  <span className="mx-1.5 opacity-40">·</span>
                </>
              )}
              {displayPublisher(pkg)}
            </>
          )}
        </p>
      </div>

      {/* Source badge (e.g. msstore / winget) */}
      {pkg.source && pkg.source !== "winget" && (
        <Badge variant="secondary" className="hidden shrink-0 sm:inline-flex">
          {pkg.source}
        </Badge>
      )}

      <div className="flex shrink-0 items-center gap-2">
        {/* Homepage link */}
        {pkg.homepage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity duration-[140ms] group-hover:opacity-100 focus-visible:opacity-100"
            onClick={onOpenHomepage ?? (() => window.open(pkg.homepage, "_blank"))}
            aria-label="Open homepage"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* Primary action */}
        {variant === "installed" && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 min-w-[90px]"
            onClick={onAction}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Removing...
              </>
            ) : (
              <>
                <Trash2 className="h-3.5 w-3.5" />
                Uninstall
              </>
            )}
          </Button>
        )}

        {variant === "update" && (
          <Button
            size="sm"
            className="h-8 min-w-[80px]"
            onClick={onAction}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="h-3.5 w-3.5" />
                Update
              </>
            )}
          </Button>
        )}

        {variant === "generic" && pkg.installed && (
          <Badge variant="secondary">
            <Check className="mr-1 h-3 w-3" />
            Installed
          </Badge>
        )}
      </div>
    </div>
  );
}
