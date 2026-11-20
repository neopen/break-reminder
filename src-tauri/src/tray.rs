use tauri::menu::{ContextMenu, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

use crate::scheduler;
use crate::state::AppState;

/// 创建托盘图标。左键打开主窗口，右键弹出菜单；锁屏期间禁用菜单。
pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示主窗口", true, None::<&str>)?;
    let start_item = MenuItem::with_id(app, "start", "开始提醒", true, None::<&str>)?;
    let stop_item = MenuItem::with_id(app, "stop", "停止提醒", true, None::<&str>)?;
    let skip_item = MenuItem::with_id(app, "skip", "跳过本次", true, None::<&str>)?;
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
            &quit_item,
        ],
    )?;

    let mut builder = TrayIconBuilder::with_id("main-tray")
        .tooltip("Breakly - 拒绝久坐")
        .on_tray_icon_event(move |tray, event| {
            let TrayIconEvent::Click {
                button,
                button_state,
                ..
            } = event
            else {
                return;
            };

            if !matches!(button_state, MouseButtonState::Up) {
                return;
            }

            let app = tray.app_handle();
            match button {
                // 左键：打开主窗口
                MouseButton::Left => show_main_window(app),
                // 右键：弹出菜单；锁屏期间完全禁用，防止绕过强制休息
                MouseButton::Right => {
                    if app.get_webview_window("lock").is_none() {
                        if let Some(webview) = app.get_webview_window("main") {
                            let window = webview.as_ref().window();
                            let _ = menu.popup(window);
                        }
                    }
                }
                _ => {}
            }
        });

    if let Some(icon) = app.default_window_icon() {
        builder = builder.icon(icon.clone());
    }

    builder.build(app)?;
    Ok(())
}

/// 处理托盘菜单项事件。菜单通过左键手动弹出，因此使用应用级菜单事件。
pub fn handle_menu_event(app: &AppHandle, id: &str) {
    // 锁屏提醒期间禁用托盘菜单的全部操作，避免用户强制关闭。
    if app.get_webview_window("lock").is_some() {
        return;
    }

    match id {
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
        "quit" => {
            app.state::<AppState>()
                .quitting
                .store(true, std::sync::atomic::Ordering::SeqCst);
            app.exit(0);
        }
        _ => {}
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
