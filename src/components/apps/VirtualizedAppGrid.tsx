import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { SearchX } from "lucide-react";
import { AppCard } from "@/components/apps/AppCard";
import { EmptyState } from "@/components/common/EmptyState";
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns";
import type { WingetPackage } from "@/types/package";

interface VirtualizedAppGridProps {
  packages: WingetPackage[];
  installedIds?: Set<string>;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

const CARD_HEIGHT = 196; // estimated row height in px
const GAP = 12;

export function VirtualizedAppGrid({
  packages,
  installedIds,
  selectable,
  selectedIds,
  onToggleSelect,
  emptyTitle = "No results found",
  emptyDescription = "Try a different search term or browse all packages.",
}: VirtualizedAppGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  // Fix: use ResizeObserver-based hook instead of one-shot window.innerWidth calc
  const columns = useResponsiveColumns(parentRef);

  const rows: WingetPackage[][] = [];
  for (let i = 0; i < packages.length; i += columns) {
    rows.push(packages.slice(i, i + columns));
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CARD_HEIGHT + GAP,
    overscan: 4,
  });

  if (packages.length === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto pb-8 pr-1">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualRow.size - GAP}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-3"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                }}
              >
                {row.map((pkg) => (
                  <AppCard
                    key={pkg.id}
                    pkg={pkg}
                    installedIds={installedIds}
                    selectable={selectable}
                    selected={selectedIds?.has(pkg.id)}
                    onToggleSelect={() => onToggleSelect?.(pkg.id)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
