<div align="center">
  <img src="assets/logo.png" alt="WinGit Logo" width="120" height="120" />
  
  # WinGit

  ### Graphical Interface for the Windows Package Manager (winget)

  [![License: GPL v3](https://img.shields.io/badge/License-GPL_v3-blue.svg?style=for-the-badge)](LICENSE)
  [![Tauri Version](https://img.shields.io/badge/Tauri-v2-FFC107?style=for-the-badge&logo=tauri&logoColor=white)](https://tauri.app/)
  [![React Version](https://img.shields.io/badge/React-v19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
  [![Platform Compatibility](https://img.shields.io/badge/Platform-Windows_10_/_11-0078D4?style=for-the-badge&logo=windows&logoColor=white)](#requirements)
  [![PRs Welcome](https://img.shields.io/badge/PRs-Welcome-brightgreen.svg?style=for-the-badge)](CONTRIBUTING.md)

  <p align="center">
    WinGit provides a graphical user interface for the Windows Package Manager (winget). It enables users to browse, search, install, update, and manage their software catalog directly.
  </p>

  [Features](#features) • [Screenshots](#screenshots) • [Requirements](#requirements) • [Development Setup](#development-setup) • [Architecture](#architecture) • [Roadmap](#roadmap)
</div>

---

## Features

- **App Catalog and Virtualized Grid**: Search and browse packages. Utilizes a virtualized grid for rendering performance and supports quick activation via `Ctrl+K`.
- **Background Operations**: Background installations stream real-time progress events directly to the user interface, avoiding terminal window flashes.
- **Update Management**: Scan for outdated software and execute individual or batch updates.
- **SQLite Local Cache**: Local SQLite caching for package registry listings, favorites, settings, and icon routing.
- **Modern Interface**: Designed with Tailwind CSS 4, Radix UI, and transitions powered by Framer Motion.
- **Favorites and Manifest Management**: Select and save favorite applications, with support for configuration import and export.

---

## Screenshots

### Discover and Browse Packages
Explore the package catalog with virtualized listing and local caching.
![Home Page](assets/screenshots/Home.png)

### Installed Applications Management
View all installed software, search the list, and execute uninstallation routines.
![Installed Page](assets/screenshots/Installed.png)

### Update Center
Identify and execute software updates.
![Updates Page](assets/screenshots/Updates.png)

---

## Requirements

Before running or developing WinGit, verify that your environment meets the following requirements:
*   **Operating System**: Windows 10 or Windows 11
*   **Package Manager**: [winget CLI tool](https://learn.microsoft.com/en-us/windows/package-manager/winget/)
*   **WebView Runtime**: WebView2 Runtime (installed by default on Windows 11; required for Windows 10)

---

## Development Setup

To build WinGit locally or contribute to the repository:

### Prerequisites
1.  **Node.js 18+** (with npm)
2.  **Rust & Cargo** (via [rustup](https://rustup.rs/))
3.  **C++ Build Tools for Visual Studio**

### Local Setup
Clone the repository and install dependencies:
```bash
git clone https://github.com/Ankits39229/wingit.git
cd wingit
npm install
```

Start the application in development mode:
```bash
npm run tauri dev
```
*This command runs the Vite dev server for the React frontend and compiles the Tauri Rust binary in development mode with active hot reloading.*

Build the production installer:
```bash
npm run tauri build
```
The compiled installer package is output to: `src-tauri/target/release/bundle/`.

---

### Frontend (`src/`)
*   **Routing & Views**: React Router paths for `Home`, `Installed`, `Updates`, `Favorites`, and `Settings`.
*   **State Management**: Zustand stores manage the active installation queue (`installQueueStore`), favorites list (`favoritesStore`), and settings configuration (`settingsStore`).
*   **Data Fetching**: TanStack Query manages query cache invalidation so updates and installs refresh lists instantly.
*   **IPC Communication**: All Rust commands are routed through the central `src/services/api.ts` handler.

### Backend (`src-tauri/`)
*   **winget CLI Integration**: Rust spawns child processes for winget commands (search, list, install, uninstall) with the `CREATE_NO_WINDOW` flag to suppress terminal window flashes.
*   **Local Caches**: Stores package indexing, recently installed lists, and settings inside a local SQLite database (`wingit.db`).
*   **Icon Fetching**: Resolves favicons using Clearbit/Google API fallbacks and stores them in a local disk cache (`icon_cache/`).

---

## Roadmap

- [ ] **Winget Sources Manager**: Edit and manage custom repositories directly from the Settings UI.
- [ ] **Scheduled Updates Check**: Periodic background checks for package updates with native Windows notifications.
- [ ] **Advanced Package Filter**: Filter packages by category, publisher, and licensing type.
- [ ] **Backup Sync**: Sync favorites and installation manifests to GitHub Gists or cloud drives.
- [ ] **Interactive CLI Fallback Console**: Toggleable terminal terminal view for users who want to see raw stdout.

---

## Contributing

Contributions are welcome. Please read the [Contribution Guidelines](CONTRIBUTING.md) to set up your environment, follow code formatting conventions, and submit Pull Requests.

---

## License

WinGit is open-source software licensed under the **GNU General Public License v3 (GPL v3)**. See the [LICENSE](LICENSE) file for details.
