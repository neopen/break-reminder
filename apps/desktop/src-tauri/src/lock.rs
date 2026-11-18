use std::sync::atomic::Ordering;
use std::time::Duration;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

use crate::keyboard;
use crate::state::{AppState, LockConfig};

/// 打开全屏置顶的提醒窗口，并同步启用键盘拦截。
pub fn open(app: &AppHandle, duration_secs: u64, force_lock: bool) -> Result<(), String> {
    let state = app.state::<AppState>();

    {
        let mut config = state
            .lock_config
            .lock()
            .map_err(|_| "锁屏配置状态已损坏".to_string())?;
        *config = LockConfig {
            duration_secs,
            force_lock,
        };
    }

    let generation = state.lock_generation.fetch_add(1, Ordering::SeqCst) + 1;

    if let Some(existing) = app.get_webview_window("lock") {
        let _ = existing.destroy();
    }

    let window = WebviewWindowBuilder::new(app, "lock", WebviewUrl::App("lock.html".into()))
        .title("健康提醒")
        .fullscreen(true)
        .always_on_top(true)
        .decorations(false)
        .skip_taskbar(true)
        .resizable(false)
        .closable(false)
        .focused(true)
        .visible(true)
        .build()
        .map_err(|error| format!("创建锁屏窗口失败: {error}"))?;

    let _ = window.show();
    let _ = window.set_focus();
    let _ = window.set_always_on_top(true);

    keyboard::start()?;

    // 每 2 秒重新断言置顶与焦点，防止被其他窗口抢占。
    let handle = app.clone();
    std::thread::spawn(move || {
        let iterations = (duration_secs.min(1800) / 2).saturating_add(15);
        for _ in 0..iterations {
            std::thread::sleep(Duration::from_secs(2));

            let state = handle.state::<AppState>();
            if state.lock_generation.load(Ordering::SeqCst) != generation {
                break;
            }

            let Some(window) = handle.get_webview_window("lock") else {
                break;
            };

            let _ = window.set_always_on_top(true);
            let _ = window.set_focus();
        }
    });

    Ok(())
}

/// 关闭锁屏窗口并停止键盘拦截。
pub fn close(app: &AppHandle) {
    keyboard::stop();

    let state = app.state::<AppState>();
    state.lock_generation.fetch_add(1, Ordering::SeqCst);

    if let Some(window) = app.get_webview_window("lock") {
        let _ = window.destroy();
    }
}
