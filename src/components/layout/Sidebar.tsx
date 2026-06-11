import { useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Download,
  RefreshCw,
  Heart,
  Settings,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { useSettingsStore } from "@/store/settingsStore";

const browseNav = [
  { to: "/", icon: Home, label: "Discover" },
  { to: "/favorites", icon: Heart, label: "Favorites" },
];

const libraryNav = [
  { to: "/installed", icon: Download, label: "Installed" },
  { to: "/updates", icon: RefreshCw, label: "Updates" },
];

const systemNav = [
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface NavGroupProps {
  label: string;
  items: typeof browseNav;
  collapsed: boolean;
}

function NavGroup({ label, items, collapsed }: NavGroupProps) {
  return (
    <div className="flex flex-col gap-0.5">
      {!collapsed && (
        <p className="mb-0.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-muted/60">
          {label}
        </p>
      )}
      {items.map(({ to, icon: Icon, label: itemLabel }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          title={collapsed ? itemLabel : undefined}
          className={({ isActive }) =>
            cn(
              "relative flex w-full items-center rounded-md py-2 text-sm font-medium",
              "transition-colors duration-[140ms] ease-out",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              collapsed ? "justify-center px-2" : "gap-3 px-3",
              isActive
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Active indicator pill */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
                  aria-hidden
                />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{itemLabel}</span>}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export function Sidebar() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggle = useSettingsStore((s) => s.toggleSidebar);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggle]);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-border bg-sidebar",
        "transition-[width] duration-[240ms] ease-[cubic-bezier(0.32,0.72,0,1)]",
        collapsed ? "w-[52px]" : "w-52",
      )}
    >
      <nav
        className={cn(
          "flex flex-1 flex-col gap-4 overflow-y-auto",
          collapsed ? "p-1.5 pt-3" : "p-2 pt-3",
        )}
        aria-label="Main navigation"
      >
        <NavGroup label="Browse" items={browseNav} collapsed={collapsed} />
        <NavGroup label="Library" items={libraryNav} collapsed={collapsed} />
        <div className="flex-1" />
        <NavGroup label="System" items={systemNav} collapsed={collapsed} />
      </nav>

      {!collapsed && (
        <p className="px-4 pb-1 text-[10px] text-sidebar-muted/40">v0.1.0</p>
      )}

      <button
        type="button"
        onClick={toggle}
        className={cn(
          "m-1.5 flex items-center rounded-md p-2 text-sidebar-muted",
          "transition-colors duration-[140ms] hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "active:scale-[0.97]",
          collapsed ? "justify-center" : "gap-2",
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand (Ctrl+B)" : "Collapse (Ctrl+B)"}
      >
        {collapsed ? (
          <PanelLeft className="h-4 w-4" />
        ) : (
          <>
            <PanelLeftClose className="h-4 w-4" />
            <span className="text-xs font-medium">Collapse</span>
          </>
        )}
      </button>
    </aside>
  );
}
