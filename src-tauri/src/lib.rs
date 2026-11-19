mod commands;
mod keyboard;
mod lock;
mod state;
mod tray;

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
            commands::get_lock_config,
            commands::set_keyboard_blocking,
            commands::open_lock_window,
            commands::close_lock_window,
            commands::open_main_window,
        ])
        .setup(|app| {
            tray::create(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if window.label() == "lock" && matches!(event, tauri::WindowEvent::Destroyed) {
                keyboard::stop();
            }
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
