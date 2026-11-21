use std::sync::atomic::Ordering;

use serde::Serialize;
use tauri::{AppHandle, Manager, State};

use crate::config::AppConfig;
use crate::keyboard;
use crate::lock;
use crate::scheduler::{self, SchedulerStatus};
use crate::state::{AppState, LockConfig, LockOutcome};
use crate::stats::StatsSummary;

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
pub fn get_config(state: State<'_, AppState>) -> AppConfig {
    state
        .config
        .lock()
        .map(|config| config.clone())
        .unwrap_or_default()
}

#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<AppConfig, String> {
    scheduler::apply_config(&app, config)
}

#[tauri::command]
pub fn get_stats(app: AppHandle) -> StatsSummary {
    scheduler::refresh_stats(&app)
}

#[tauri::command]
pub fn reset_today_stats(app: AppHandle) -> StatsSummary {
    scheduler::reset_today(&app)
}

#[tauri::command]
pub fn get_scheduler_status(app: AppHandle) -> SchedulerStatus {
    scheduler::status(&app)
}

#[tauri::command]
pub fn start_reminders(app: AppHandle) -> Result<(), String> {
    scheduler::start(&app)
}

#[tauri::command]
pub fn stop_reminders(app: AppHandle) {
    scheduler::stop(&app);
}

#[tauri::command]
pub fn snooze_reminder(app: AppHandle, minutes: u32) -> Result<(), String> {
    scheduler::snooze(&app, minutes)
}

#[tauri::command]
pub fn skip_reminder(app: AppHandle) -> Result<(), String> {
    scheduler::skip(&app)
}

#[tauri::command]
pub fn complete_lock(app: AppHandle) -> Result<(), String> {
    scheduler::resolve_lock(&app, LockOutcome::Completed);
    Ok(())
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
        scheduler::resolve_lock(&handle, LockOutcome::Skipped);
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

#[tauri::command]
pub fn quit_app(app: AppHandle) {
    app.state::<AppState>()
        .quitting
        .store(true, Ordering::SeqCst);
    app.exit(0);
}
