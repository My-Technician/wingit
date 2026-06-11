export interface WingetPackage {
  id: string;
  name: string;
  version?: string;
  source?: string;
  publisher?: string;
  description?: string;
  homepage?: string;
  tags?: string[];
  category?: string;
  installed: boolean;
  availableVersion?: string;
  // Rich metadata — populated by show_package only
  license?: string;
  licenseUrl?: string;
  author?: string;
  moniker?: string;
  releaseNotes?: string;
  releaseDate?: string;
  publisherUrl?: string;
  supportUrl?: string;
  privacyUrl?: string;
}

export interface PackageMetadata {
  id: string;
  name: string;
  publisher?: string;
  category?: string;
  website?: string;
  iconUrl?: string;
  description?: string;
  tags?: string;
  version?: string;
}

export interface FavoriteEntry {
  packageId: string;
  addedAt: string;
}

export interface InstallProgress {
  packageId: string;
  line: string;
  status: "running" | "success" | "error";
}

export interface ExportData {
  exportedAt: string;
  packages: string[];
}

export type InstallJobStatus = "queued" | "running" | "success" | "error";

export interface InstallJob {
  packageId: string;
  name: string;
  status: InstallJobStatus;
  progress: number;
  log: string;
}
