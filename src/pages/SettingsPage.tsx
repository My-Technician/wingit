import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Moon, Sun, Monitor, Trash2, Download, Upload, Package, FileJson } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/common/PageHeader";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { SettingRow } from "@/components/settings/SettingRow";
import { useSettingsStore, type Theme } from "@/store/settingsStore";
import { api } from "@/services/api";
import type { ExportData } from "@/types/package";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const autoUpdateCheck = useSettingsStore((s) => s.autoUpdateCheck);
  const setAutoUpdateCheck = useSettingsStore((s) => s.setAutoUpdateCheck);
  const concurrentDownloads = useSettingsStore((s) => s.concurrentDownloads);
  const setConcurrentDownloads = useSettingsStore((s) => s.setConcurrentDownloads);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const clearCache = useMutation({
    mutationFn: async () => {
      await api.clearPackageCache();
      await api.clearIconCache();
    },
    onSuccess: () => toast.success("Cache cleared"),
    onError: (e) => toast.error(String(e)),
  });

  const exportPkgs = useMutation({
    mutationFn: () => api.exportInstalled(),
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wingit-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${data.packages.length} packages`);
    },
    onError: (e) => toast.error(String(e)),
  });

  const importPkgs = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const parsed: ExportData = JSON.parse(text);
      if (!Array.isArray(parsed.packages)) {
        throw new Error("Invalid export file format");
      }
      return api.importPackages(parsed.packages);
    },
    onSuccess: (results) => {
      const ok = results.filter((r) => r.endsWith("ok")).length;
      const fail = results.length - ok;
      toast.success(
        fail > 0
          ? `Imported ${ok} packages (${fail} failed)`
          : `Importing ${ok} packages...`,
      );
      queryClient.invalidateQueries({ queryKey: ["packages"] });
    },
    onError: (e) => toast.error(String(e)),
  });

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) importPkgs.mutate(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  const themes: { value: Theme; icon: typeof Sun; label: string }[] = [
    { value: "light", icon: Sun, label: "Light" },
    { value: "dark", icon: Moon, label: "Dark" },
    { value: "system", icon: Monitor, label: "System" },
  ];

  return (
    <div className="mx-auto h-full max-w-2xl space-y-6 overflow-y-auto pr-3 pb-8">
      <PageHeader
        title="Settings"
        description="Appearance, updates, and data preferences."
      />

      {/* Appearance */}
      <section className="space-y-4 rounded-xl border border-border bg-card p-5">
        <div>
          <h2 className="text-sm font-semibold tracking-tight">Appearance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Choose how WinGit looks on your system.
          </p>
        </div>
        <div className="flex gap-2">
          {themes.map(({ value, icon: Icon, label }) => (
            <Button
              key={value}
              variant={theme === value ? "default" : "outline"}
              onClick={() => setTheme(value)}
              className="flex-1 active:scale-[0.97]"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      </section>

      {/* Updates */}
      <section className="rounded-xl border border-border bg-card">
        <div className="p-5 pb-0">
          <h2 className="text-sm font-semibold tracking-tight">Updates</h2>
        </div>
        <div className="p-5">
          <SettingRow
            label="Auto-check for updates"
            description="Check for app updates when WinGit launches."
          >
            <Switch checked={autoUpdateCheck} onCheckedChange={setAutoUpdateCheck} />
          </SettingRow>
        </div>
      </section>

      {/* Downloads */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold tracking-tight">Downloads</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Concurrent downloads</p>
              <p className="text-xs text-muted-foreground">
                Higher values install faster but use more bandwidth.
              </p>
            </div>
            <span className="rounded-lg bg-muted px-2.5 py-1 text-sm font-medium tabular-nums">
              {concurrentDownloads}
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={concurrentDownloads}
            onChange={(e) => setConcurrentDownloads(parseInt(e.target.value, 10))}
            className="w-full"
            aria-label="Concurrent downloads"
          />
        </div>
      </section>

      {/* Data */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-sm font-semibold tracking-tight">Data</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Export or import your installed packages list. Clear cached data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => exportPkgs.mutate()}
            disabled={exportPkgs.isPending}
            className="active:scale-[0.97]"
          >
            <Upload className="h-4 w-4" />
            Export installed
          </Button>

          {/* Hidden file input for import */}
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            onChange={handleImportFile}
            aria-label="Import packages file"
          />
          <Button
            variant="outline"
            onClick={() => importInputRef.current?.click()}
            disabled={importPkgs.isPending}
            className="active:scale-[0.97]"
          >
            {importPkgs.isPending ? (
              <>
                <FileJson className="h-4 w-4" />
                Importing...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Import packages
              </>
            )}
          </Button>

          <Button
            variant="destructive"
            onClick={() => setShowClearConfirm(true)}
            disabled={clearCache.isPending}
            className="active:scale-[0.97]"
          >
            <Trash2 className="h-4 w-4" />
            Clear cache
          </Button>
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold tracking-tight">About</h2>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold tracking-tight">WinGit</p>
            <p className="text-xs text-muted-foreground">Version 0.1.0</p>
            <p className="text-xs text-muted-foreground">
              Open-source GUI for Windows Package Manager
            </p>
          </div>
        </div>
      </section>

      <ConfirmDialog
        open={showClearConfirm}
        onOpenChange={setShowClearConfirm}
        title="Clear all cache?"
        description="This removes all cached package data and icons. They will be re-fetched as needed."
        confirmLabel="Clear cache"
        variant="destructive"
        onConfirm={() => clearCache.mutate()}
        loading={clearCache.isPending}
      />
    </div>
  );
}
