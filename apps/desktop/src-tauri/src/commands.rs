use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::keyboard;
use crate::lock;
use crate::state::{AppState, LockConfig};

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeStatus {
    pub blocking: bool,
    pub hook_installed: bool,
    pub platform_supported: bool,
    pub platform: String,
}

#[tauri::command]
pub fn get_runtime_status() -> RuntimeStatus {
    RuntimeStatus {
        blocking: keyboard::is_blocking(),
        hook_installed: keyboard::is_installed(),
        platform_supported: keyboard::is_supported(),
        platform: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
pub fn get_lock_config(state: State<'_, AppState>) -> LockConfig {
    state
        .lock_config
        .lock()
        .map(|config| config.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn set_keyboard_blocking(enabled: bool) -> Result<(), String> {
    if enabled {
        keyboard::start()
    } else {
        keyboard::stop();
        Ok(())
    }
}

#[tauri::command]
pub fn open_lock_window(
    app: AppHandle,
    duration_secs: Option<u64>,
    force_lock: Option<bool>,
) -> Result<(), String> {
    let duration = duration_secs.unwrap_or(60).clamp(5, 3600);
    lock::open(&app, duration, force_lock.unwrap_or(false))
}

#[tauri::command]
pub async fn close_lock_window(app: AppHandle) -> Result<(), String> {
    // 异步命令先返回 IPC 响应，再销毁窗口，避免在窗口自身的调用里等待。
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        lock::close(&handle);
    });
    Ok(())
}

#[tauri::command]
pub fn open_main_window(app: AppHandle) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Err("主窗口不存在".to_string());
    };

    window.show().map_err(|error| error.to_string())?;
    let _ = window.unminimize();
    window.set_focus().map_err(|error| error.to_string())
}
