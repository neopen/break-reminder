use std::fs;
use std::path::{Path, PathBuf};

use serde::{de::DeserializeOwned, Serialize};
use tauri::{AppHandle, Manager};

use crate::config::AppConfig;
use crate::stats::Stats;

pub struct StorePaths {
    pub config: PathBuf,
    pub stats: PathBuf,
}

pub fn init(app: &AppHandle) -> Result<StorePaths, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| format!("获取应用数据目录失败: {error}"))?
        .join("data");

    fs::create_dir_all(&dir).map_err(|error| format!("创建数据目录失败: {error}"))?;

    Ok(StorePaths {
        config: dir.join("config.json"),
        stats: dir.join("stats.json"),
    })
}

pub fn load_config(path: &Path) -> AppConfig {
    load_json::<AppConfig>(path)
        .unwrap_or_default()
        .normalize()
}

pub fn load_stats(path: &Path) -> Stats {
    load_json::<Stats>(path).unwrap_or_default()
}

pub fn save_config(path: &Path, config: &AppConfig) -> Result<(), String> {
    save_json(path, config)
}

pub fn save_stats(path: &Path, stats: &Stats) -> Result<(), String> {
    save_json(path, stats)
}

fn load_json<T: DeserializeOwned>(path: &Path) -> Option<T> {
    let content = fs::read_to_string(path).ok()?;
    match serde_json::from_str(&content) {
        Ok(value) => Some(value),
        Err(error) => {
            eprintln!("[store] 读取 {} 失败: {error}", path.display());
            None
        }
    }
}

fn save_json<T: Serialize>(path: &Path, value: &T) -> Result<(), String> {
    let content = serde_json::to_vec_pretty(value).map_err(|error| error.to_string())?;
    let temp = path.with_extension("tmp");

    fs::write(&temp, content).map_err(|error| format!("写入临时文件失败: {error}"))?;

    if path.exists() {
        fs::remove_file(path).map_err(|error| format!("删除旧数据文件失败: {error}"))?;
    }

    fs::rename(&temp, path).map_err(|error| format!("替换数据文件失败: {error}"))
}
