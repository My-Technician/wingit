use crate::validation::{sanitize_search_query, validate_package_id};
use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::sync::OnceLock;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

static JSON_OUTPUT_SUPPORTED: OnceLock<bool> = OnceLock::new();
static MULTI_SPACE: OnceLock<Regex> = OnceLock::new();

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WingetPackage {
    pub id: String,
    pub name: String,
    pub version: Option<String>,
    pub source: Option<String>,
    pub publisher: Option<String>,
    pub description: Option<String>,
    pub homepage: Option<String>,
    pub tags: Option<Vec<String>>,
    pub category: Option<String>,
    pub installed: bool,
    pub available_version: Option<String>,
    // Rich metadata — populated only by show_package / parse_show_from_text
    pub license: Option<String>,
    pub license_url: Option<String>,
    pub author: Option<String>,
    pub moniker: Option<String>,
    pub release_notes: Option<String>,
    pub release_date: Option<String>,
    pub publisher_url: Option<String>,
    pub support_url: Option<String>,
    pub privacy_url: Option<String>,
}

fn winget_command() -> Command {
    let mut cmd = Command::new("winget");
    #[cfg(windows)]
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

fn multi_space_re() -> &'static Regex {
    MULTI_SPACE.get_or_init(|| Regex::new(r"\s{2,}").expect("regex"))
}

fn strip_ansi(text: &str) -> String {
    static ANSI: OnceLock<Regex> = OnceLock::new();
    let re = ANSI.get_or_init(|| Regex::new(r"\x1b\[[0-9;]*[A-Za-z]").expect("ansi regex"));
    re.replace_all(text, "").to_string()
}

fn winget_supports_json() -> bool {
    *JSON_OUTPUT_SUPPORTED.get_or_init(|| {
        let output = winget_command()
            .args([
                "search",
                "a",
                "--source",
                "winget",
                "--output",
                "json",
                "--disable-interactivity",
                "--nowarn",
            ])
            .output();

        match output {
            Ok(o) => {
                let stdout = String::from_utf8_lossy(&o.stdout);
                stdout.trim().starts_with('{') || stdout.trim().starts_with('[')
            }
            Err(_) => false,
        }
    })
}

fn is_noise_line(line: &str) -> bool {
    let t = line.trim();
    t.is_empty()
        || t.contains('█')
        || t.contains('▒')
        || t.contains('▀')
        || t.starts_with("Windows Package Manager")
        || t.starts_with("Copyright (c)")
        || t.starts_with("The ")
        || t.starts_with("Found ")
        || t.starts_with("No installed")
        || t == "-" || t == "\\" || t == "|" || t == "/"
}

/// Derive a display publisher from a winget id (e.g. `Microsoft.VisualStudioCode` → `Microsoft`).
fn infer_publisher_from_id(id: &str) -> Option<String> {
    let segment = id.split('.').next()?.trim();
    if segment.is_empty() {
        None
    } else {
        Some(segment.to_string())
    }
}

fn with_inferred_publisher(mut pkg: WingetPackage) -> WingetPackage {
    if pkg
        .publisher
        .as_ref()
        .map(|s| s.trim().is_empty())
        .unwrap_or(true)
    {
        pkg.publisher = infer_publisher_from_id(&pkg.id);
    }
    pkg
}

fn is_separator_line(line: &str) -> bool {
    let t = line.trim();
    t.len() >= 10 && t.chars().filter(|&c| c == '-').count() >= t.len() / 2
}

fn run_winget(args: &[&str], include_json: bool) -> Result<String, String> {
    // winget v1.28 requires flags after the subcommand (e.g. `winget search foo --nowarn`).
    let mut full_args: Vec<&str> = args.to_vec();
    if include_json && winget_supports_json() {
        full_args.push("--output");
        full_args.push("json");
    }
    full_args.push("--disable-interactivity");
    full_args.push("--nowarn");

    let output = winget_command()
        .args(&full_args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Failed to run winget: {e}"))?;

    let stdout = strip_ansi(&String::from_utf8_lossy(&output.stdout));
    let stderr = strip_ansi(&String::from_utf8_lossy(&output.stderr));
    let combined = format!("{stdout}\n{stderr}");

    if !output.status.success() && combined.trim().is_empty() {
        return Err(format!("winget exited with status {}", output.status));
    }

    Ok(combined)
}

fn parse_packages_from_json(raw: &str) -> Result<Vec<WingetPackage>, String> {
    let trimmed = raw.trim();
    let json_start = trimmed
        .find('{')
        .or_else(|| trimmed.find('['))
        .ok_or_else(|| "No JSON found in winget output".to_string())?;
    let json_str = &trimmed[json_start..];

    let value: Value =
        serde_json::from_str(json_str).map_err(|e| format!("JSON parse error: {e}"))?;
    let packages = value
        .get("Packages")
        .or_else(|| value.get("packages"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut result = Vec::new();
    for pkg in packages {
        let id = pkg
            .get("PackageIdentifier")
            .or_else(|| pkg.get("Id"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        if id.is_empty() {
            continue;
        }
        // Parse tags from JSON (array of strings)
        let tags: Option<Vec<String>> = pkg
            .get("Tags")
            .and_then(|v| v.as_array())
            .map(|arr| {
                arr.iter()
                    .filter_map(|t| t.as_str())
                    .map(String::from)
                    .collect()
            })
            .filter(|v: &Vec<String>| !v.is_empty());

        result.push(with_inferred_publisher(WingetPackage {
            id: id.clone(),
            name: pkg
                .get("PackageName")
                .or_else(|| pkg.get("Name"))
                .and_then(|v| v.as_str())
                .unwrap_or(&id)
                .to_string(),
            version: pkg
                .get("Version")
                .or_else(|| pkg.get("InstalledVersion"))
                .and_then(|v| v.as_str())
                .map(String::from),
            source: pkg.get("Source").and_then(|v| v.as_str()).map(String::from),
            publisher: pkg
                .get("Publisher")
                .and_then(|v| v.as_str())
                .map(String::from),
            description: pkg
                .get("Description")
                .and_then(|v| v.as_str())
                .map(String::from),
            homepage: pkg
                .get("PackageUrl")
                .or_else(|| pkg.get("Homepage"))
                .and_then(|v| v.as_str())
                .map(String::from),
            tags,
            category: pkg
                .get("Category")
                .and_then(|v| v.as_str())
                .map(String::from),
            installed: false,
            available_version: pkg
                .get("AvailableVersion")
                .and_then(|v| v.as_str())
                .map(String::from),
            license: None,
            license_url: None,
            author: None,
            moniker: None,
            release_notes: None,
            release_date: None,
            publisher_url: None,
            support_url: None,
            privacy_url: None,
        }));
    }
    Ok(result)
}

fn parse_packages_from_table(raw: &str) -> Result<Vec<WingetPackage>, String> {
    let lines: Vec<&str> = raw
        .lines()
        .map(str::trim_end)
        .filter(|l| !is_noise_line(l))
        .collect();

    let sep_idx = lines
        .iter()
        .position(|l| is_separator_line(l))
        .ok_or_else(|| {
            let preview: String = raw.chars().take(200).collect();
            format!("Could not parse winget table output: {preview}")
        })?;

    if sep_idx == 0 {
        return Err("Invalid winget table: missing header".into());
    }

    let header = lines[sep_idx - 1].to_lowercase();
    let has_available = header.contains("available");
    let has_match = header.contains("match");

    let mut result = Vec::new();
    for line in &lines[sep_idx + 1..] {
        if is_separator_line(line) {
            continue;
        }
        let cols: Vec<&str> = multi_space_re()
            .split(line.trim())
            .filter(|c| !c.is_empty())
            .collect();

        if cols.len() < 2 {
            continue;
        }

        let name = cols[0].to_string();
        let id = cols[1].to_string();
        if id.is_empty() || name.is_empty() {
            continue;
        }

        let version = cols.get(2).map(|s| s.to_string());
        let available_version = if has_available && cols.len() >= 4 {
            cols.get(3).filter(|s| !s.is_empty()).map(|s| s.to_string())
        } else {
            None
        };
        let source = if has_available && cols.len() >= 5 {
            cols.get(4).map(|s| s.to_string())
        } else if !has_match && cols.len() >= 4 {
            cols.get(3).map(|s| s.to_string())
        } else {
            None
        };

        result.push(with_inferred_publisher(WingetPackage {
            id,
            name,
            version,
            source,
            publisher: None,
            description: None,
            homepage: None,
            tags: None,
            category: None,
            installed: false,
            available_version,
            license: None,
            license_url: None,
            author: None,
            moniker: None,
            release_notes: None,
            release_date: None,
            publisher_url: None,
            support_url: None,
            privacy_url: None,
        }));
    }

    if result.is_empty() {
        return Err("No packages found in winget output".into());
    }

    Ok(result)
}

fn parse_winget_output(raw: &str) -> Result<Vec<WingetPackage>, String> {
    let trimmed = raw.trim();
    if trimmed.contains('{') || trimmed.contains('[') {
        if let Ok(pkgs) = parse_packages_from_json(trimmed) {
            if !pkgs.is_empty() {
                return Ok(pkgs);
            }
        }
    }
    parse_packages_from_table(raw)
}

fn run_search_query(query: &str) -> Result<Vec<WingetPackage>, String> {
    let sanitized = sanitize_search_query(query);
    if sanitized.is_empty() {
        return Err("Search query is empty".into());
    }

    let raw = run_winget(
        &["search", &sanitized, "--source", "winget"],
        true,
    )?;
    parse_winget_output(&raw)
}

/// Broad catalog for older winget builds that require a search term.
pub fn browse_catalog() -> Result<Vec<WingetPackage>, String> {
    // Older winget requires a search term; merge several seeds for reasonable coverage.
    let seeds = ["a", "e", "i", "o", "u", "s", "t", "n", "r", "d", "1", "2"];

    let mut by_id: HashMap<String, WingetPackage> = HashMap::new();
    for seed in seeds {
        if let Ok(pkgs) = run_search_query(seed) {
            for pkg in pkgs {
                by_id.insert(pkg.id.clone(), pkg);
            }
        }
    }

    if by_id.is_empty() {
        return Err(
            "Could not load packages from winget. Try searching in Discover.".into(),
        );
    }

    Ok(by_id.into_values().collect())
}

pub fn search_packages(query: Option<&str>) -> Result<Vec<WingetPackage>, String> {
    match query.filter(|s| !s.trim().is_empty()) {
        Some(q) => run_search_query(q),
        None => browse_catalog(),
    }
}

pub fn list_installed() -> Result<Vec<WingetPackage>, String> {
    let raw = run_winget(&["list"], true)?;
    let mut packages = parse_winget_output(&raw)?;
    for p in &mut packages {
        p.installed = true;
    }
    Ok(packages)
}

pub fn list_upgrades() -> Result<Vec<WingetPackage>, String> {
    let raw = run_winget(&["upgrade"], true)?;
    let mut packages = parse_winget_output(&raw)?;
    for p in &mut packages {
        p.installed = true;
    }
    Ok(packages)
}

pub fn install_package(id: &str) -> Result<String, String> {
    validate_package_id(id)?;
    let output = winget_command()
        .args([
            "install",
            "--id",
            id,
            "-e",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--disable-interactivity",
            "--nowarn",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Install failed: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout}\n{stderr}");
    if output.status.success() {
        Ok(combined)
    } else {
        Err(combined)
    }
}

const UNINSTALL_TAIL: &[&str] = &[
    "--accept-source-agreements",
    "--disable-interactivity",
    "--nowarn",
];

fn dedup_push_uninstall_attempt(strategies: &mut Vec<Vec<String>>, attempt: Vec<String>) {
    if strategies.iter().any(|existing| existing == &attempt) {
        return;
    }
    strategies.push(attempt);
}

/// Build winget uninstall argument lists: prefer non-exact `--id` (matches what `winget list`
/// returns), optionally scoped with `--source`, then exact match, then the same for `--name`.
fn push_uninstall_selector_attempts(
    strategies: &mut Vec<Vec<String>>,
    selector_flag: &str,
    selector_value: &str,
    source: Option<&str>,
) {
    for exact in [false, true] {
        for use_source in [true, false] {
            if use_source && source.is_none() {
                continue;
            }
            let mut v = vec![
                "uninstall".to_string(),
                selector_flag.to_string(),
                selector_value.to_string(),
            ];
            if exact {
                v.push("-e".to_string());
            }
            if use_source {
                if let Some(s) = source {
                    v.push("--source".to_string());
                    v.push(s.to_string());
                }
            }
            v.extend(UNINSTALL_TAIL.iter().map(|s| (*s).to_string()));
            dedup_push_uninstall_attempt(strategies, v);
        }
    }
}

fn validate_uninstall_name(name: &str) -> Result<(), String> {
    if name.len() > 512 {
        return Err("Invalid package name for uninstall".into());
    }
    if name
        .chars()
        .any(|c| matches!(c, '\0' | '\r' | '\n'))
    {
        return Err("Invalid package name for uninstall".into());
    }
    Ok(())
}

/// Uninstall using `--id` and fallbacks. `source` should match the Source column from
/// `winget list` when present (e.g. `winget`, `msstore`); `--name` helps when the id does not match.
pub fn uninstall_package(
    id: &str,
    name: Option<&str>,
    source: Option<&str>,
) -> Result<String, String> {
    validate_package_id(id)?;
    let source = source.map(str::trim).filter(|s| !s.is_empty());
    let name = name.map(str::trim).filter(|s| !s.is_empty());
    if let Some(n) = name {
        validate_uninstall_name(n)?;
    }

    let mut strategies: Vec<Vec<String>> = Vec::new();
    push_uninstall_selector_attempts(&mut strategies, "--id", id, source);
    if let Some(n) = name {
        push_uninstall_selector_attempts(&mut strategies, "--name", n, source);
    }

    let mut last_err = "Uninstall failed: no strategies generated".to_string();
    for args in strategies {
        let output = winget_command()
            .args(&args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Uninstall failed: {e}"))?;

        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let combined = format!("{stdout}\n{stderr}");
        if output.status.success() {
            return Ok(combined);
        }
        last_err = combined;
    }

    Err(last_err)
}

pub fn upgrade_package(id: Option<&str>) -> Result<String, String> {
    let mut cmd = winget_command();
    cmd.args([
        "upgrade",
        "--accept-package-agreements",
        "--accept-source-agreements",
        "--disable-interactivity",
        "--nowarn",
    ]);
    if let Some(package_id) = id {
        validate_package_id(package_id)?;
        cmd.args(["--id", package_id, "-e"]);
    } else {
        cmd.arg("--all");
    }

    let output = cmd
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| format!("Upgrade failed: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{stdout}\n{stderr}");
    if output.status.success() {
        Ok(combined)
    } else {
        Err(combined)
    }
}

fn run_winget_show(id: &str, exact: bool) -> Result<String, String> {
    let mut args: Vec<&str> = vec!["show", "--id", id];
    if exact {
        args.push("-e");
    }
    args.push("--disable-interactivity");
    args.push("--nowarn");
    // `winget show` does not support `--output json` on many builds (unlike `search`).
    run_winget(&args, false)
}

static SHOW_FIELD: OnceLock<Regex> = OnceLock::new();

fn is_show_field_line(line: &str) -> bool {
    let re = SHOW_FIELD.get_or_init(|| {
        Regex::new(
            r"^(Version|Publisher|Publisher Url|Publisher Support Url|Author|Moniker|Description|Homepage|License|License Url|Privacy Url|Copyright|Copyright Url|Release Notes|Tags|Installer|Manifest|Release Date|Download Url):",
        )
        .expect("show field regex")
    });
    re.is_match(line.trim())
}

/// Parse plain-text output from `winget show`.
fn parse_show_from_text(raw: &str, fallback_id: &str) -> Option<WingetPackage> {
    static FOUND_RE: OnceLock<Regex> = OnceLock::new();
    let found_re = FOUND_RE.get_or_init(|| {
        Regex::new(r"^Found (.+?) \[([^\]]+)\]\s*$").expect("found line regex")
    });

    let mut name = String::new();
    let mut id = fallback_id.to_string();
    let mut version: Option<String> = None;
    let mut publisher: Option<String> = None;
    let mut description: Option<String> = None;
    let mut homepage: Option<String> = None;
    let mut license: Option<String> = None;
    let mut license_url: Option<String> = None;
    let mut author: Option<String> = None;
    let mut moniker: Option<String> = None;
    let mut release_notes: Option<String> = None;
    let mut release_date: Option<String> = None;
    let mut publisher_url: Option<String> = None;
    let mut support_url: Option<String> = None;
    let mut privacy_url: Option<String> = None;
    let mut tags: Option<Vec<String>> = None;

    let mut in_description = false;
    let mut in_release_notes = false;
    let mut in_tags = false;
    let mut description_lines: Vec<String> = Vec::new();
    let mut release_notes_lines: Vec<String> = Vec::new();
    let mut tag_lines: Vec<String> = Vec::new();

    for line in raw.lines() {
        let trimmed = line.trim();

        if trimmed.is_empty() {
            if in_description {
                description_lines.push(String::new());
            } else if in_release_notes {
                release_notes_lines.push(String::new());
            }
            continue;
        }

        // Check for "Found <name> [<id>]" BEFORE noise filter — is_noise_line swallows it.
        if let Some(caps) = found_re.captures(trimmed) {
            name = caps.get(1).map(|m| m.as_str().trim().to_string()).unwrap_or_default();
            id = caps
                .get(2)
                .map(|m| m.as_str().trim().to_string())
                .unwrap_or_else(|| fallback_id.to_string());
            in_description = false;
            in_release_notes = false;
            in_tags = false;
            continue;
        }

        if is_noise_line(trimmed) {
            continue;
        }

        // Stop collecting multi-line content when a new known field starts.
        if is_show_field_line(trimmed) {
            in_description = false;
            in_release_notes = false;
            in_tags = false;
        }

        if in_description {
            description_lines.push(trimmed.to_string());
            continue;
        }
        if in_release_notes {
            release_notes_lines.push(trimmed.to_string());
            continue;
        }
        // Multi-line tags: each tag on its own indented line (winget output format).
        if in_tags {
            // A tag line is a single token (no colon at start); stop on next field.
            if !trimmed.contains(':') || trimmed.ends_with(':') {
                let tok = trimmed.trim_start_matches('-').trim().to_string();
                if !tok.is_empty() {
                    tag_lines.push(tok);
                }
            }
            continue;
        }

        // Split on first ':' so padded output ("Version:    1.2") is handled correctly.
        if let Some(colon_pos) = trimmed.find(':') {
            let label = trimmed[..colon_pos].trim();
            let val = trimmed[colon_pos + 1..].trim().to_string();
            match label {
                "Version" => version = Some(val),
                "Publisher" => publisher = Some(val),
                "Publisher Url" | "Publisher URL" => publisher_url = Some(val),
                "Publisher Support Url" | "Publisher Support URL" => support_url = Some(val),
                "Author" => author = Some(val),
                "Moniker" => moniker = Some(val),
                "Description" => {
                    if !val.is_empty() {
                        description_lines.push(val);
                    }
                    in_description = true;
                }
                "Homepage" => homepage = Some(val),
                "License" => license = Some(val),
                "License Url" | "License URL" => license_url = Some(val),
                "Privacy Url" | "Privacy URL" => privacy_url = Some(val),
                "Tags" => {
                    if !val.is_empty() {
                        // Single-line comma-separated tags
                        tags = Some(
                            val.split(',')
                                .map(|t| t.trim().to_string())
                                .filter(|t| !t.is_empty())
                                .collect(),
                        );
                    } else {
                        // Multi-line tags — each on its own indented line
                        in_tags = true;
                    }
                }
                "Release Date" => release_date = Some(val),
                "Release Notes" | "Release Notes (Locale)" => {
                    if !val.is_empty() {
                        release_notes_lines.push(val);
                    }
                    in_release_notes = true;
                }
                _ => {}
            }
        }
    }

    // Finalise multi-line tags collected above
    if !tag_lines.is_empty() && tags.is_none() {
        tags = Some(tag_lines);
    }

    if !description_lines.is_empty() {
        description = Some(description_lines.join("\n").trim().to_string());
    }
    if !release_notes_lines.is_empty() {
        release_notes = Some(release_notes_lines.join("\n").trim().to_string());
    }

    if name.is_empty() && id == fallback_id {
        return None;
    }

    Some(with_inferred_publisher(WingetPackage {
        id,
        name: if name.is_empty() {
            fallback_id.to_string()
        } else {
            name
        },
        version,
        source: None,
        publisher,
        description,
        homepage,
        tags,
        category: None,
        installed: false,
        available_version: None,
        license,
        license_url,
        author,
        moniker,
        release_notes,
        release_date,
        publisher_url,
        support_url,
        privacy_url,
    }))
}

fn search_by_package_id(id: &str) -> Result<Vec<WingetPackage>, String> {
    let raw = run_winget(&["search", "--id", id], true)?;
    parse_winget_output(&raw)
}

pub fn show_package(id: &str) -> Result<WingetPackage, String> {
    validate_package_id(id)?;

    for exact in [false, true] {
        if let Ok(raw) = run_winget_show(id, exact) {
            if let Some(pkg) = parse_show_from_text(&raw, id) {
                return Ok(pkg);
            }
        }
    }

    if let Ok(packages) = search_by_package_id(id) {
        if let Some(p) = packages
            .iter()
            .find(|p| p.id.eq_ignore_ascii_case(id))
            .cloned()
        {
            return Ok(p);
        }
        if let Some(p) = packages.into_iter().next() {
            return Ok(p);
        }
    }

    search_packages(Some(id))?
        .into_iter()
        .find(|p| p.id.eq_ignore_ascii_case(id))
        .ok_or_else(|| "Package not found".to_string())
}

pub fn stream_install_logs(id: &str, on_line: impl Fn(&str)) -> Result<(), String> {
    validate_package_id(id)?;
    let mut child = winget_command()
        .args([
            "install",
            "--id",
            id,
            "-e",
            "--accept-package-agreements",
            "--accept-source-agreements",
            "--disable-interactivity",
            "--nowarn",
        ])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn winget: {e}"))?;

    if let Some(stdout) = child.stdout.take() {
        let reader = BufReader::new(stdout);
        for line in reader.lines().map_while(Result::ok) {
            on_line(&line);
        }
    }
    if let Some(stderr) = child.stderr.take() {
        let reader = BufReader::new(stderr);
        for line in reader.lines().map_while(Result::ok) {
            on_line(&line);
        }
    }

    let status = child.wait().map_err(|e| e.to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("Installation failed".into())
    }
}
