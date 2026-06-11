use chrono::Utc;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PackageMetadata {
    pub id: String,
    pub name: String,
    pub publisher: Option<String>,
    pub category: Option<String>,
    pub website: Option<String>,
    pub icon_url: Option<String>,
    pub description: Option<String>,
    pub tags: Option<String>,
    pub version: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FavoriteEntry {
    pub package_id: String,
    pub added_at: String,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_data_dir: PathBuf) -> Result<Self, String> {
        std::fs::create_dir_all(&app_data_dir).map_err(|e| e.to_string())?;
        let db_path = app_data_dir.join("wingit.db");
        let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
        let db = Self {
            conn: Mutex::new(conn),
        };
        db.init_schema()?;
        Ok(db)
    }

    fn init_schema(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute_batch(
            r"
            CREATE TABLE IF NOT EXISTS packages_cache (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                publisher TEXT,
                version TEXT,
                description TEXT,
                category TEXT,
                website TEXT,
                icon_url TEXT,
                tags TEXT,
                raw_json TEXT,
                cached_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS favorites (
                package_id TEXT PRIMARY KEY,
                added_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS icons (
                package_id TEXT PRIMARY KEY,
                local_path TEXT NOT NULL,
                source_url TEXT,
                cached_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS recently_installed (
                package_id TEXT PRIMARY KEY,
                installed_at TEXT NOT NULL
            );
            ",
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn upsert_packages(&self, packages: &[PackageMetadata]) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let now = Utc::now().to_rfc3339();
        let tx = conn.unchecked_transaction().map_err(|e| e.to_string())?;
        for pkg in packages {
            tx.execute(
                r"INSERT INTO packages_cache (id, name, publisher, version, description, category, website, icon_url, tags, cached_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
                 ON CONFLICT(id) DO UPDATE SET
                   name=excluded.name, publisher=excluded.publisher, version=excluded.version,
                   description=excluded.description, category=excluded.category, website=excluded.website,
                   icon_url=excluded.icon_url, tags=excluded.tags, cached_at=excluded.cached_at",
                params![
                    pkg.id,
                    pkg.name,
                    pkg.publisher,
                    pkg.version,
                    pkg.description,
                    pkg.category,
                    pkg.website,
                    pkg.icon_url,
                    pkg.tags,
                    now,
                ],
            )
            .map_err(|e| e.to_string())?;
        }
        tx.commit().map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_cached_package_by_id(&self, id: &str) -> Result<Option<PackageMetadata>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                r"SELECT id, name, publisher, category, website, icon_url, description, tags, version
                  FROM packages_cache WHERE id = ?1",
            )
            .map_err(|e| e.to_string())?;
        let mut rows = stmt
            .query_map([id], |row| {
                Ok(PackageMetadata {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    publisher: row.get(2)?,
                    category: row.get(3)?,
                    website: row.get(4)?,
                    icon_url: row.get(5)?,
                    description: row.get(6)?,
                    tags: row.get(7)?,
                    version: row.get(8)?,
                })
            })
            .map_err(|e| e.to_string())?;
        if let Some(row) = rows.next() {
            Ok(Some(row.map_err(|e| e.to_string())?))
        } else {
            Ok(None)
        }
    }

    pub fn get_cached_packages(&self, limit: i64) -> Result<Vec<PackageMetadata>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                r"SELECT id, name, publisher, category, website, icon_url, description, tags, version
                  FROM packages_cache ORDER BY name LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([limit], |row| {
                Ok(PackageMetadata {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    publisher: row.get(2)?,
                    category: row.get(3)?,
                    website: row.get(4)?,
                    icon_url: row.get(5)?,
                    description: row.get(6)?,
                    tags: row.get(7)?,
                    version: row.get(8)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn get_favorites(&self) -> Result<Vec<FavoriteEntry>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT package_id, added_at FROM favorites ORDER BY added_at DESC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(FavoriteEntry {
                    package_id: row.get(0)?,
                    added_at: row.get(1)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn add_favorite(&self, package_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR IGNORE INTO favorites (package_id, added_at) VALUES (?1, ?2)",
            params![package_id, Utc::now().to_rfc3339()],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_favorite(&self, package_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "DELETE FROM favorites WHERE package_id = ?1",
            [package_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT value FROM settings WHERE key = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([key]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(row.get(0).map_err(|e| e.to_string())?))
        } else {
            Ok(None)
        }
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?1, ?2)
             ON CONFLICT(key) DO UPDATE SET value = excluded.value",
            params![key, value],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn record_recent_install(&self, package_id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO recently_installed (package_id, installed_at) VALUES (?1, ?2)
             ON CONFLICT(package_id) DO UPDATE SET installed_at = excluded.installed_at",
            params![package_id, Utc::now().to_rfc3339()],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_recently_installed(&self, limit: i64) -> Result<Vec<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare(
                "SELECT package_id FROM recently_installed ORDER BY installed_at DESC LIMIT ?1",
            )
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([limit], |row| row.get(0))
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn save_icon(&self, package_id: &str, local_path: &str, source_url: Option<&str>) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO icons (package_id, local_path, source_url, cached_at) VALUES (?1, ?2, ?3, ?4)
             ON CONFLICT(package_id) DO UPDATE SET local_path=excluded.local_path, source_url=excluded.source_url, cached_at=excluded.cached_at",
            params![package_id, local_path, source_url, Utc::now().to_rfc3339()],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn get_icon_path(&self, package_id: &str) -> Result<Option<String>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT local_path FROM icons WHERE package_id = ?1")
            .map_err(|e| e.to_string())?;
        let mut rows = stmt.query([package_id]).map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().map_err(|e| e.to_string())? {
            Ok(Some(row.get(0).map_err(|e| e.to_string())?))
        } else {
            Ok(None)
        }
    }

    pub fn clear_package_cache(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM packages_cache", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }
}
