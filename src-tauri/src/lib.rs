mod commands;
mod config;
mod keyboard;
mod lock;
mod scheduler;
mod state;
mod stats;
mod store;
mod tray;

use std::sync::atomic::Ordering;

use tauri::Manager;
use tauri_plugin_autostart::ManagerExt as AutostartManagerExt;

use state::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // WebView2 默认要求用户手势才能播放音频；提醒需要无手势自动播放。
    #[cfg(target_os = "windows")]
    std::env::set_var(
        "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
        "--autoplay-policy=no-user-gesture-required",
    );

    tauri::Builder::default()
        // 单实例插件必须最先注册
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--autostart"]),
        ))
        .manage(AppState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_runtime_status,
            commands::get_config,
            commands::save_config,
            commands::get_stats,
            commands::get_daily_records,
            commands::reset_today_stats,
            commands::get_scheduler_status,
            commands::start_reminders,
            commands::stop_reminders,
            commands::snooze_reminder,
            commands::skip_reminder,
            commands::complete_lock,
            commands::get_lock_config,
            commands::set_keyboard_blocking,
            commands::open_lock_window,
            commands::close_lock_window,
            commands::open_main_window,
            commands::quit_app,
        ])
        .setup(|app| {
            // 开机自启由插件附加 --autostart 参数，用于区分静默启动与手动启动。
            let launched_at_login = std::env::args().any(|arg| arg == "--autostart");
            let handle = app.handle();
            let paths = store::init(handle).map_err(std::io::Error::other)?;

            // 首次运行默认开启开机启动；写入标记后，后续启动尊重用户的手动开关。
            let autostart_marker = paths.config.with_file_name("autostart-defaulted");
            if !autostart_marker.exists() {
                let manager = handle.autolaunch();
                let enabled = manager.is_enabled().unwrap_or(false) || manager.enable().is_ok();
                if enabled {
                    let _ = std::fs::write(&autostart_marker, b"1");
                }
            }

            let config = store::load_config(&paths.config);
            let mut stats = store::load_stats(&paths.stats);
            let now = chrono::Local::now();
            let mut changed = stats.rollover(now);
            changed |= stats.fix_streak(now);
            if changed {
                let _ = store::save_stats(&paths.stats, &stats);
            }

            let auto_start_reminders = config.auto_start_reminders;
            {
                let state = handle.state::<AppState>();
                *state
                    .config
                    .lock()
                    .map_err(|_| std::io::Error::other("配置状态已损坏"))? = config;
                *state
                    .stats
                    .lock()
                    .map_err(|_| std::io::Error::other("统计状态已损坏"))? = stats;
            }

            // 仅缩放主窗口；锁屏页保持原始比例。
            if let Some(window) = handle.get_webview_window("main") {
                let _ = window.set_zoom(0.85);
                // 开机自启时静默驻留托盘，不展开主界面；手动启动则正常显示。
                if !launched_at_login {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }

            tray::create(handle)?;
            scheduler::spawn_resume_watcher(handle.clone());

            if auto_start_reminders {
                if let Err(error) = scheduler::start(handle) {
                    eprintln!("[scheduler] 开机后自动启动提醒失败: {error}");
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                let app = window.app_handle();
                let quitting = app.state::<AppState>().quitting.load(Ordering::SeqCst);
                if !quitting {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
            tauri::WindowEvent::Destroyed if window.label() == "lock" => {
                keyboard::stop();
                scheduler::on_lock_destroyed(window.app_handle());
            }
            _ => {}
        })
        .on_menu_event(|app, event| tray::handle_menu_event(app, event.id.as_ref()))
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
