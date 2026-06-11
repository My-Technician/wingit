import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "@/services/api";

export type Theme = "light" | "dark" | "system";

interface SettingsState {
  theme: Theme;
  sidebarCollapsed: boolean;
  autoUpdateCheck: boolean;
  concurrentDownloads: number;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  setAutoUpdateCheck: (value: boolean) => void;
  setConcurrentDownloads: (value: number) => void;
  applyTheme: () => void;
  syncToBackend: () => Promise<void>;
  loadFromBackend: () => Promise<void>;
  /** Call once on app mount. Returns cleanup fn. */
  setupThemeListener: () => () => void;
}

function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: "system",
      sidebarCollapsed: false,
      autoUpdateCheck: true,
      concurrentDownloads: 2,

      setTheme: (theme) => {
        set({ theme });
        get().applyTheme();
        get().syncToBackend();
      },

      toggleSidebar: () =>
        set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      setAutoUpdateCheck: (value) => {
        set({ autoUpdateCheck: value });
        get().syncToBackend();
      },

      setConcurrentDownloads: (value) => {
        set({ concurrentDownloads: Math.min(5, Math.max(1, value)) });
        get().syncToBackend();
      },

      applyTheme: () => {
        const resolved = resolveTheme(get().theme);
        document.documentElement.classList.toggle("dark", resolved === "dark");
      },

      setupThemeListener: () => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => {
          if (get().theme === "system") {
            get().applyTheme();
          }
        };
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
      },

      syncToBackend: async () => {
        const { theme, autoUpdateCheck, concurrentDownloads } = get();
        await api.setSetting("theme", theme);
        await api.setSetting("autoUpdateCheck", String(autoUpdateCheck));
        await api.setSetting(
          "concurrentDownloads",
          String(concurrentDownloads),
        );
      },

      loadFromBackend: async () => {
        try {
          const theme = (await api.getSetting("theme")) as Theme | null;
          const autoUpdate = await api.getSetting("autoUpdateCheck");
          const concurrent = await api.getSetting("concurrentDownloads");
          if (theme) set({ theme });
          if (autoUpdate != null)
            set({ autoUpdateCheck: autoUpdate === "true" });
          if (concurrent)
            set({ concurrentDownloads: parseInt(concurrent, 10) || 2 });
          get().applyTheme();
        } catch (e) {
          console.error("Failed to load settings from backend", e);
          get().applyTheme();
        }
      },
    }),
    { name: "wingit-settings" },
  ),
);
