import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";

export function useSearchPackages(query: string, enabled = true) {
  return useQuery({
    queryKey: ["packages", "search", query],
    queryFn: () => api.searchPackages(query || undefined),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useInstalledPackages() {
  return useQuery({
    queryKey: ["packages", "installed"],
    queryFn: () => api.listInstalled(),
    staleTime: 60 * 1000,
  });
}

export function useUpgrades() {
  return useQuery({
    queryKey: ["packages", "upgrades"],
    queryFn: () => api.listUpgrades(),
    staleTime: 60 * 1000,
  });
}

export function usePackageDetails(id: string) {
  return useQuery({
    queryKey: ["packages", "details", id],
    queryFn: () => api.showPackage(id),
    enabled: !!id,
  });
}

export function useCatalogRefresh() {
  return useQuery({
    queryKey: ["packages", "catalog"],
    queryFn: () => api.refreshCatalog(),
    staleTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useRecentlyInstalled(limit = 8) {
  return useQuery({
    queryKey: ["packages", "recently-installed", limit],
    queryFn: () => api.getRecentlyInstalled(limit),
    staleTime: 5 * 60 * 1000,
  });
}
