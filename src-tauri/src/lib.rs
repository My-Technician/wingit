mod cache;
mod database;
mod validation;
mod winget;

use cache::{clear_icon_cache, fetch_and_cache_icon, icon_cache_dir};
use database::{Database, FavoriteEntry, PackageMetadata};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, Manager, State};
use winget::WingetPackage;

const INSTALL_PROGRESS_EVENT: &str = "install-progress";

struct AppState {
    db: Arc<Database>,
    data_dir: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InstallProgress {
    package_id: String,
    line: String,
    status: String,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ExportData {
    exported_at: String,
    packages: Vec<String>,
}

#[tauri::command]
fn search_packages(query: Option<String>) -> Result<Vec<WingetPackage>, String> {
    winget::search_packages(query.as_deref())
}

#[tauri::command]
fn list_installed() -> Result<Vec<WingetPackage>, String> {
    winget::list_installed()
}

#[tauri::command]
fn list_upgrades() -> Result<Vec<WingetPackage>, String> {
    winget::list_upgrades()
}

fn metadata_to_winget(meta: PackageMetadata) -> WingetPackage {
    WingetPackage {
        id: meta.id,
        name: meta.name,
        version: meta.version,
        source: None,
        publisher: meta.publisher,
        description: meta.description,
        homepage: meta.website,
        tags: meta.tags.map(|t| {
            t.split(',')
                .map(str::trim)
                .filter(|s| !s.is_empty())
                .map(String::from)
                .collect()
        }),
        category: meta.category,
        installed: false,
        available_version: None,
        license: None,
        license_url: None,
        author: None,
        moniker: None,
        release_notes: None,
        release_date: None,
        publisher_url: None,
        support_url: None,
        privacy_url: None,
    }
}

#[tauri::command]
fn show_package(state: State<'_, AppState>, id: String) -> Result<WingetPackage, String> {
    match winget::show_package(&id) {
        Ok(pkg) => Ok(pkg),
        Err(e) => {
            if let Ok(Some(meta)) = state.db.get_cached_package_by_id(&id) {
                Ok(metadata_to_winget(meta))
            } else {
                Err(e)
            }
        }
    }
}

#[tauri::command]
async fn install_package(
    app: AppHandle,
    state: State<'_, AppState>,
    id: String,
) -> Result<(), String> {
    validation::validate_package_id(&id)?;
    let app_handle = app.clone();
    let package_id = id.clone();
    let db = state.db.clone();

    tauri::async_runtime::spawn(async move {
        let emit = |line: &str, status: &str| {
            let _ = app_handle.emit(
                INSTALL_PROGRESS_EVENT,
                InstallProgress {
                    package_id: package_id.clone(),
                    line: line.to_string(),
                    status: status.to_string(),
                },
            );
        };

        emit("Starting installation...", "running");
        let pid = package_id.clone();
        let progress_app = app_handle.clone();
        let result = tauri::async_runtime::spawn_blocking(move || {
            winget::stream_install_logs(&pid, |line| {
                let _ = progress_app.emit(
                    INSTALL_PROGRESS_EVENT,
                    InstallProgress {
                        package_id: pid.clone(),
                        line: line.to_string(),
                        status: "running".to_string(),
                    },
                );
            })
        })
        .await;

        match result {
            Ok(Ok(())) => {
                let _ = db.record_recent_install(&package_id);
                emit("Installation complete", "success");
            }
            Ok(Err(e)) => emit(&e, "error"),
            Err(e) => emit(&e.to_string(), "error"),
        }
    });

    Ok(())
}

#[tauri::command]
async fn uninstall_package(
    id: String,
    name: Option<String>,
    source: Option<String>,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        winget::uninstall_package(
            &id,
            name.as_deref(),
            source.as_deref(),
        )
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn upgrade_package(id: Option<String>) -> Result<String, String> {
    let id_clone = id.clone();
    tauri::async_runtime::spawn_blocking(move || winget::upgrade_package(id_clone.as_deref()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn get_favorites(state: State<'_, AppState>) -> Result<Vec<FavoriteEntry>, String> {
    state.db.get_favorites()
}

#[tauri::command]
fn add_favorite(state: State<'_, AppState>, package_id: String) -> Result<(), String> {
    validation::validate_package_id(&package_id)?;
    state.db.add_favorite(&package_id)
}

#[tauri::command]
fn remove_favorite(state: State<'_, AppState>, package_id: String) -> Result<(), String> {
    validation::validate_package_id(&package_id)?;
    state.db.remove_favorite(&package_id)
}

#[tauri::command]
fn get_cached_packages(state: State<'_, AppState>, limit: Option<i64>) -> Result<Vec<PackageMetadata>, String> {
    state.db.get_cached_packages(limit.unwrap_or(5000))
}

#[tauri::command]
fn cache_packages(state: State<'_, AppState>, packages: Vec<PackageMetadata>) -> Result<(), String> {
    state.db.upsert_packages(&packages)
}

#[tauri::command]
fn clear_package_cache(state: State<'_, AppState>) -> Result<(), String> {
    state.db.clear_package_cache()
}

#[tauri::command]
fn get_setting(state: State<'_, AppState>, key: String) -> Result<Option<String>, String> {
    state.db.get_setting(&key)
}

#[tauri::command]
fn set_setting(state: State<'_, AppState>, key: String, value: String) -> Result<(), String> {
    state.db.set_setting(&key, &value)
}

#[tauri::command]
fn get_recently_installed(state: State<'_, AppState>, limit: Option<i64>) -> Result<Vec<String>, String> {
    state.db.get_recently_installed(limit.unwrap_or(20))
}

#[tauri::command]
async fn fetch_package_icon(
    state: State<'_, AppState>,
    package_id: String,
    website: Option<String>,
) -> Result<Option<String>, String> {
    validation::validate_package_id(&package_id)?;
    let db = state.db.clone();
    let cache_dir = icon_cache_dir(&state.data_dir);
    fetch_and_cache_icon(&db, &cache_dir, &package_id, website.as_deref()).await
}

#[tauri::command]
fn get_icon_path(state: State<'_, AppState>, package_id: String) -> Result<Option<String>, String> {
    validation::validate_package_id(&package_id)?;
    state.db.get_icon_path(&package_id)
}

#[tauri::command]
fn clear_icon_cache_cmd(state: State<'_, AppState>) -> Result<(), String> {
    clear_icon_cache(&icon_cache_dir(&state.data_dir))
}

#[tauri::command]
async fn export_installed_packages() -> Result<ExportData, String> {
    let installed = winget::list_installed()?;
    Ok(ExportData {
        exported_at: chrono::Utc::now().to_rfc3339(),
        packages: installed.into_iter().map(|p| p.id).collect(),
    })
}

#[tauri::command]
async fn import_packages(ids: Vec<String>) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    for id in ids {
        if validation::validate_package_id(&id).is_err() {
            results.push(format!("{id}: invalid id"));
            continue;
        }
        match winget::install_package(&id) {
            Ok(_) => results.push(format!("{id}: ok")),
            Err(e) => results.push(format!("{id}: {e}")),
        }
    }
    Ok(results)
}

#[tauri::command]
async fn refresh_catalog(state: State<'_, AppState>) -> Result<Vec<WingetPackage>, String> {
    let packages = winget::browse_catalog()?;
    let metadata: Vec<PackageMetadata> = packages
        .iter()
        .map(|p| PackageMetadata {
            id: p.id.clone(),
            name: p.name.clone(),
            publisher: p.publisher.clone(),
            category: p.category.clone(),
            website: p.homepage.clone(),
            icon_url: None,
            description: p.description.clone(),
            tags: p.tags.as_ref().map(|t| t.join(", ")),
            version: p.version.clone(),
        })
        .collect();
    state.db.upsert_packages(&metadata)?;
    Ok(packages)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| e.to_string())?;
            let db = Arc::new(Database::new(data_dir.clone())?);
            app.manage(AppState { db, data_dir });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            search_packages,
            list_installed,
            list_upgrades,
            show_package,
            install_package,
            uninstall_package,
            upgrade_package,
            get_favorites,
            add_favorite,
            remove_favorite,
            get_cached_packages,
            cache_packages,
            clear_package_cache,
            get_setting,
            set_setting,
            get_recently_installed,
            fetch_package_icon,
            get_icon_path,
            clear_icon_cache_cmd,
            export_installed_packages,
            import_packages,
            refresh_catalog,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
