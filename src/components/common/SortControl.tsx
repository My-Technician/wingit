import { ArrowUpDown, Check } from "lucide-react";
import {
  DropdownMenuRoot,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSortStore } from "@/store/sortStore";
import type { SortKey } from "@/utils/sortPackages";
import { cn } from "@/utils/cn";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name-asc", label: "Name A–Z" },
  { key: "name-desc", label: "Name Z–A" },
  { key: "publisher", label: "Publisher" },
];

export function SortControl() {
  const sort = useSortStore((s) => s.sort);
  const setSort = useSortStore((s) => s.setSort);
  const current = SORT_OPTIONS.find((o) => o.key === sort) ?? SORT_OPTIONS[0];

  return (
    <DropdownMenuRoot>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Sort packages"
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5",
            "text-xs text-muted-foreground transition-colors duration-[140ms]",
            "hover:border-border/80 hover:text-foreground active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          )}
        >
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{current.label}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {SORT_OPTIONS.map((opt) => (
          <DropdownMenuItem
            key={opt.key}
            onClick={() => setSort(opt.key)}
            className="flex items-center justify-between"
          >
            {opt.label}
            {sort === opt.key && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenuRoot>
  );
}
