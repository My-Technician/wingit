import type { WingetPackage } from "@/types/package";

export type SortKey = "name-asc" | "name-desc" | "publisher";

export function sortPackages(packages: WingetPackage[], key: SortKey): WingetPackage[] {
  return [...packages].sort((a, b) => {
    switch (key) {
      case "name-asc":
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      case "name-desc":
        return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
      case "publisher": {
        const pubA = a.publisher ?? "";
        const pubB = b.publisher ?? "";
        const cmp = pubA.localeCompare(pubB, undefined, { sensitivity: "base" });
        return cmp !== 0
          ? cmp
          : a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
    }
  });
}
