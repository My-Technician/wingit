# Contributing to WinGit

Thank you for considering contributing to WinGit. Contributions from the community help improve this software.

By contributing to this project, you agree to abide by our Code of Conduct and standard open-source conventions.

---

## Table of Contents

- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Pull Requests](#pull-requests)
- [Local Development Setup](#local-development-setup)
  - [Prerequisites](#prerequisites)
  - [Installation Steps](#installation-steps)
- [Project Architecture](#project-architecture)
  - [Frontend (React + Vite)](#frontend-react--vite)
  - [Backend (Tauri + Rust)](#backend-tauri--rust)
- [Coding Guidelines](#coding-guidelines)
  - [Frontend (TypeScript & React)](#frontend-typescript--react)
  - [Backend (Rust)](#backend-rust)
- [Commit Message Guidelines](#commit-message-guidelines)
- [License](#license)

---

## How Can I Contribute?

### Reporting Bugs

Before submitting a bug report, please check the [issues list](https://github.com/Ankits39229/wingit/issues) to verify if the issue has already been reported.

When opening a new issue, please include:
- A clear and descriptive title.
- Steps to reproduce the bug.
- The expected behavior vs. actual behavior.
- Your environment details (Windows version, Winget version, WinGit version).
- Relevant log output or screenshots.

### Suggesting Enhancements

If you have suggestions for new features:
- Open an issue explaining the proposed feature and its utility.
- Provide mockups or screenshots if applicable.

### Pull Requests

1. Fork the repository and create your branch from `main`.
2. Install dependencies and implement your changes.
3. Verify your changes (ensure builds and linters pass).
4. Submit a Pull Request targeting the `main` branch.

---

## Local Development Setup

### Prerequisites

To build WinGit locally, you need the following dependencies installed on your Windows system:
1. **Windows 10 or 11** with the [winget command line utility](https://learn.microsoft.com/en-us/windows/package-manager/winget/) installed.
2. **Node.js 18+** (including npm).
3. **Rust & Cargo** (via [rustup](https://rustup.rs/)).
4. **WebView2 Runtime** (preinstalled on Windows 11; required for Windows 10).
5. **Visual Studio C++ Build Tools** (specifically MSVC build tools for Rust compilation).

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Ankits39229/wingit.git
   cd wingit
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Run in Development Mode**
   ```bash
   npm run tauri dev
   ```
   This command starts the Vite dev server for the React frontend and compiles the Tauri native wrapper. Hot reloading is enabled for both frontend and backend files.

4. **Production Build**
   ```bash
   npm run tauri build
   ```
   This compiles the optimized production release and packages it as an installer under `src-tauri/target/release/bundle/`.

---

## Project Architecture

WinGit consists of two primary modules working together via Tauri IPC:

### Frontend (React + Vite)
- Located in `src/`
- Implements the glassmorphism dashboard, catalog grid, installed apps table, settings page, and update center.
- Uses **Zustand** for state management, **TanStack Query** (React Query) for API caching, and **Framer Motion** for animations.

### Backend (Tauri + Rust)
- Located in `src-tauri/`
- Interacts with the local SQLite database (`wingit.db`) for caching package listings and user settings.
- Executes `winget` CLI commands under the hood with `CREATE_NO_WINDOW` flags to ensure a seamless UI-only experience.

---

## Coding Guidelines

### Frontend (TypeScript & React)
- **Use the API Service**: All IPC communication with the Rust backend must pass through `src/services/api.ts`. Do not call `invoke()` directly in components.
- **Component Styling**: Use Tailwind CSS 4. Prefer the defined color variables in `src/index.css` to keep the UI consistent.
- **Types**: Always type command responses and props. Store shared types in `src/types/`.

### Backend (Rust)
- **Formatter & Linter**: Ensure code formatting by running `cargo fmt` and `cargo clippy` inside `src-tauri/`.
- **Error Handling**: Use the custom error enum defined with `thiserror` to return type-safe, readable errors back to the frontend.
- **Safety**: Do not run arbitrary commands. Ensure package IDs and search queries are fully sanitized/validated using the validators in `src-tauri/src/validation.rs`.

---

## Commit Message Guidelines

We follow a semantic commit message convention (similar to Angular). This helps auto-generate changelogs:

```
<type>(<scope>): <subject>
```

- **feat**: A new feature.
- **fix**: A bug fix.
- **docs**: Documentation changes.
- **style**: Code style changes (formatting, missing semi-colons, etc.; no production code changes).
- **refactor**: Code changes that neither fix a bug nor add a feature.
- **perf**: Performance improvements.
- **chore**: Build tasks, package updates, etc.

*Example:* `feat(catalog): add virtualized grid for fast package loading`

---

## License

By contributing to WinGit, you agree that your contributions will be licensed under the **GNU General Public License v3 (GPL v3)**.
