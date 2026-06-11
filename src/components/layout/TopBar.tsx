import { useEffect, useRef, useState } from "react";
import { Search, X, LayoutGrid, List } from "lucide-react";
import { useSearchStore } from "@/store/searchStore";
import { SortControl } from "@/components/common/SortControl";
import { cn } from "@/utils/cn";

export type ViewDensity = "grid" | "list";

interface TopBarProps {
  density?: ViewDensity;
  onDensityChange?: (d: ViewDensity) => void;
}

export function TopBar({ density, onDensityChange }: TopBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        setQuery("");
        inputRef.current?.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setQuery]);

  return (
    <header className="sticky top-0 z-10 flex h-[52px] shrink-0 items-center gap-3 bg-background px-4 border-b border-border/60">
      {/* Search bar */}
      <div
        className={cn(
          "relative flex flex-1 max-w-md items-center rounded-lg border bg-card",
          "transition-[border-color,box-shadow] duration-[140ms] ease-out",
          focused
            ? "border-ring shadow-[0_0_0_3px_rgba(0,103,192,0.1)] dark:shadow-[0_0_0_3px_rgba(96,205,255,0.1)]"
            : "border-border hover:border-border/80",
        )}
      >
        <Search
          className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground"
          aria-hidden
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search packages..."
          className="h-9 w-full bg-transparent pl-9 pr-20 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          aria-label="Search packages"
        />
        <div className="absolute right-2 flex items-center gap-1">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors duration-[140ms] hover:bg-muted hover:text-foreground active:scale-[0.97]"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="hidden items-center gap-0.5 sm:flex">
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                Ctrl
              </kbd>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                K
              </kbd>
            </span>
          )}
        </div>
      </div>

      {/* Density toggle (only rendered when handler provided) */}
      {onDensityChange && (
        <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
          <button
            type="button"
            aria-label="Grid view"
            onClick={() => onDensityChange("grid")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-[140ms]",
              "active:scale-[0.95]",
              density === "grid"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="List view"
            onClick={() => onDensityChange("list")}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md transition-colors duration-[140ms]",
              "active:scale-[0.95]",
              density === "list"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <List className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Sort control */}
      <SortControl />
    </header>
  );
}
