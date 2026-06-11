import { useEffect, useState } from "react";
import { Minus, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettingsStore } from "@/store/settingsStore";
import { cn } from "@/utils/cn";

function winAction(fn: () => Promise<void>) {
  fn().catch(() => { });
}

export function TitleBar() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const win = getCurrentWindow();
    win.isMaximized().then(setIsMaximized).catch(() => { });
    let unlisten: (() => void) | undefined;
    win
      .onResized(async () => {
        setIsMaximized(await win.isMaximized());
      })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => { });
    return () => unlisten?.();
  }, []);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0 || e.defaultPrevented) return;
    winAction(() => getCurrentWindow().startDragging());
  };

  const handleDragDblClick = () => {
    winAction(() => getCurrentWindow().toggleMaximize());
  };

  return (
    <div className="flex h-8 w-full shrink-0 select-none items-center bg-sidebar border-b border-border">
      {/* Brand section width mirrors sidebar */}
      <div
        className={cn(
          "flex h-full shrink-0 items-center gap-2 overflow-hidden",
          "transition-[width] duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
          collapsed ? "w-[52px] justify-center px-0" : "w-52 px-4",
        )}
        data-tauri-drag-region
        onMouseDown={handleDragMouseDown}
        onDoubleClick={handleDragDblClick}
      >
        <img
          src="/brand-mark.png"
          alt=""
          className="h-5 w-5 shrink-0 rounded-md object-cover pointer-events-none"
        />
        {!collapsed && (
          <span className="truncate text-xs font-semibold tracking-tight text-sidebar-foreground">
            WinGit
          </span>
        )}
      </div>

      {/* Drag region fills remaining space */}
      <div
        className="flex-1 h-full cursor-default"
        data-tauri-drag-region
        onMouseDown={handleDragMouseDown}
        onDoubleClick={handleDragDblClick}
      />

      {/* Window controls */}
      <div className="flex h-full shrink-0">
        <button
          onClick={() => winAction(() => getCurrentWindow().minimize())}
          tabIndex={-1}
          aria-label="Minimize"
          className="flex h-full w-11 items-center justify-center text-sidebar-muted transition-colors duration-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>

        <button
          onClick={() => winAction(() => getCurrentWindow().toggleMaximize())}
          tabIndex={-1}
          aria-label={isMaximized ? "Restore" : "Maximize"}
          className="flex h-full w-11 items-center justify-center text-sidebar-muted transition-colors duration-100 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 1h6v6M1 3.5h6v6H1z" />
            </svg>
          ) : (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="0.5" y="0.5" width="10" height="10" />
            </svg>
          )}
        </button>

        <button
          onClick={() => winAction(() => getCurrentWindow().close())}
          tabIndex={-1}
          aria-label="Close"
          className="flex h-full w-11 items-center justify-center text-sidebar-muted transition-colors duration-100 hover:bg-red-500 hover:text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
