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
            let handle = app.handle();
            let paths = store::init(handle).map_err(std::io::Error::other)?;

            let config = store::load_config(&paths.config);
            let mut stats = store::load_stats(&paths.stats);
            let now = chrono::Local::now();
            let mut changed = stats.rollover(now);
            changed |= stats.fix_streak(now);
            if changed {
                let _ = store::save_stats(&paths.stats, &stats);
            }

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

            tray::create(handle)?;
            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                let app = window.app_handle();
                let quitting = app
                    .state::<AppState>()
                    .quitting
                    .load(Ordering::SeqCst);
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
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
