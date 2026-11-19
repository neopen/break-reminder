use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

use crate::keyboard;

/// 创建托盘图标与右键菜单。
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let lock_item =
        MenuItem::with_id(app, "lock", "打开锁屏测试（60 秒）", true, None::<&str>)?;
    let keyboard_item =
        MenuItem::with_id(app, "toggle-keyboard", "开始 / 停止键盘拦截", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let separator_one = PredefinedMenuItem::separator(app)?;
    let separator_two = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_item,
            &lock_item,
            &separator_one,
            &keyboard_item,
            &separator_two,
            &quit_item,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .tooltip("别坐了 - 健康提醒");

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "lock" => {
                if let Err(error) = crate::lock::open(app, 60, false) {
                    eprintln!("[tray] 打开锁屏失败: {error}");
                }
            }
            "toggle-keyboard" => {
                if keyboard::is_blocking() {
                    keyboard::stop();
                } else if let Err(error) = keyboard::start() {
                    eprintln!("[tray] 启动键盘拦截失败: {error}");
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
