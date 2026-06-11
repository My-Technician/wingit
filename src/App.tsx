import { useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { InstalledPage } from "@/pages/InstalledPage";
import { UpdatesPage } from "@/pages/UpdatesPage";
import { FavoritesPage } from "@/pages/FavoritesPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { AppDetailsPage } from "@/pages/AppDetailsPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { useSettingsStore } from "@/store/settingsStore";
import { useFavoritesStore } from "@/store/favoritesStore";
import { api } from "@/services/api";
import { useInstallQueueStore } from "@/store/installQueueStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false },
  },
});

/** Extract a 0-100 progress value from a winget log line. */
function parseProgressFromLine(line: string): number | null {
  // winget emits lines like "  ████  45%" or "Downloading ... 45%"
  const match = line.match(/\b(\d{1,3})%/);
  if (match) {
    const val = parseInt(match[1], 10);
    if (val >= 0 && val <= 100) return val;
  }
  return null;
}

function AppBootstrap() {
  const applyTheme = useSettingsStore((s) => s.applyTheme);
  const loadSettings = useSettingsStore((s) => s.loadFromBackend);
  const setupThemeListener = useSettingsStore((s) => s.setupThemeListener);
  const loadFavorites = useFavoritesStore((s) => s.load);
  const updateJob = useInstallQueueStore((s) => s.updateJob);
  const processQueue = useInstallQueueStore((s) => s.processQueue);

  useEffect(() => {
    applyTheme();
    loadSettings();
    loadFavorites();
    const cleanup = setupThemeListener();
    return cleanup;
  }, [applyTheme, loadSettings, loadFavorites, setupThemeListener]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    api.onInstallProgress((progress) => {
      // Parse real percentage from log line; fall back to indeterminate 40%
      const parsed = parseProgressFromLine(progress.line);
      const progressValue =
        progress.status === "success"
          ? 100
          : progress.status === "error"
            ? 0
            : parsed ?? 40;

      updateJob(progress.packageId, {
        status: progress.status,
        progress: progressValue,
        log: progress.line,
      });

      const job = useInstallQueueStore
        .getState()
        .jobs.find((j) => j.packageId === progress.packageId);
      const appName = job?.name || progress.packageId;

      if (progress.status === "success") {
        toast.success(`${appName} installed`);
        queryClient.invalidateQueries({ queryKey: ["packages"] });
        processQueue();
      }
      if (progress.status === "error") {
        toast.error(
          `Failed to install ${appName}${progress.line ? `: ${progress.line}` : ""}`,
        );
        processQueue();
      }
    }).then((fn) => {
      unlisten = fn;
    });

    return () => unlisten?.();
  }, [updateJob, processQueue]);

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/installed" element={<InstalledPage />} />
        <Route path="/updates" element={<UpdatesPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/app/:id" element={<AppDetailsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppBootstrap />
        <Toaster
          richColors
          position="bottom-right"
          toastOptions={{
            className: "rounded-lg border border-border",
            style: { fontSize: "13px" },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
