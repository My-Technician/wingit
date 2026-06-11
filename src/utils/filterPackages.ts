import type { WingetPackage } from "@/types/package";

export function filterPackages(packages: WingetPackage[], query: string): WingetPackage[] {
  const q = query.toLowerCase().trim();
  if (!q) return packages;
  return packages.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.publisher?.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q)),
  );
}
