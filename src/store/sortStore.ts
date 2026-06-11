import { create } from "zustand";
import type { SortKey } from "@/utils/sortPackages";

interface SortState {
  sort: SortKey;
  setSort: (sort: SortKey) => void;
}

export const useSortStore = create<SortState>((set) => ({
  sort: "name-asc",
  setSort: (sort) => set({ sort }),
}));
