use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::TrayIconBuilder;
use tauri::{AppHandle, Manager};

use crate::keyboard;
use crate::scheduler;
use crate::state::AppState;

/// 创建托盘图标与右键菜单。
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let start_item = MenuItem::with_id(app, "start", "开始提醒", true, None::<&str>)?;
    let stop_item = MenuItem::with_id(app, "stop", "停止提醒", true, None::<&str>)?;
    let skip_item = MenuItem::with_id(app, "skip", "跳过本次", true, None::<&str>)?;
    let lock_item = MenuItem::with_id(app, "lock", "打开锁屏测试（60 秒）", true, None::<&str>)?;
    let keyboard_item = MenuItem::with_id(
        app,
        "toggle-keyboard",
        "开始 / 停止键盘拦截",
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, "quit", "退出应用", true, None::<&str>)?;

    let snooze_menu = Submenu::with_id(app, "snooze", "稍后提醒", true)?;
    for minutes in [5, 10, 15, 30] {
        let item = MenuItem::with_id(
            app,
            format!("snooze-{minutes}"),
            format!("{minutes} 分钟后提醒"),
            true,
            None::<&str>,
        )?;
        snooze_menu.append(&item)?;
    }

    let separator_one = PredefinedMenuItem::separator(app)?;
    let separator_two = PredefinedMenuItem::separator(app)?;
    let separator_three = PredefinedMenuItem::separator(app)?;

    let menu = Menu::with_items(
        app,
        &[
            &show_item,
            &separator_one,
            &start_item,
            &stop_item,
            &snooze_menu,
            &skip_item,
            &separator_two,
            &lock_item,
            &keyboard_item,
            &separator_three,
            &quit_item,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .tooltip("Breakly - 拒绝久坐");

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder
        .on_menu_event(|app, event| match event.id.as_ref() {
            "show" => show_main_window(app),
            "start" => {
                if let Err(error) = scheduler::start(app) {
                    eprintln!("[tray] 启动提醒失败: {error}");
                }
            }
            "stop" => scheduler::stop(app),
            "skip" => {
                if let Err(error) = scheduler::skip(app) {
                    eprintln!("[tray] 跳过提醒失败: {error}");
                }
            }
            id if id.starts_with("snooze-") => {
                let minutes = id.trim_start_matches("snooze-").parse::<u32>().unwrap_or(5);
                if let Err(error) = scheduler::snooze(app, minutes) {
                    eprintln!("[tray] 稍后提醒失败: {error}");
                }
            }
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
            "quit" => {
                app.state::<AppState>()
                    .quitting
                    .store(true, std::sync::atomic::Ordering::SeqCst);
                app.exit(0);
            }
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
