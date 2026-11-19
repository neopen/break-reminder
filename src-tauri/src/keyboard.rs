use std::sync::atomic::{AtomicBool, Ordering};

/// 是否处于拦截状态。钩子回调会读取此值，因此用全局原子变量。
static BLOCKING: AtomicBool = AtomicBool::new(false);

pub fn is_supported() -> bool {
    cfg!(target_os = "windows")
}

pub fn is_blocking() -> bool {
    BLOCKING.load(Ordering::SeqCst)
}

pub fn is_installed() -> bool {
    imp::is_installed()
}

pub fn set_blocking(enabled: bool) {
    BLOCKING.store(enabled, Ordering::SeqCst);
}

/// 安装全局键盘钩子并开始拦截（放行音量键）。
pub fn start() -> Result<(), String> {
    imp::start()
}

/// 停止拦截并卸载钩子。
pub fn stop() {
    BLOCKING.store(false, Ordering::SeqCst);
    imp::stop();
}

#[cfg(target_os = "windows")]
mod imp {
    use std::sync::atomic::{AtomicBool, AtomicIsize, AtomicU32, Ordering};
    use std::sync::mpsc;
    use std::time::Duration;

    use windows_sys::Win32::Foundation::{HINSTANCE, HWND, LPARAM, LRESULT, WPARAM};
    use windows_sys::Win32::System::Threading::GetCurrentThreadId;
    use windows_sys::Win32::UI::WindowsAndMessaging::{
        CallNextHookEx, DispatchMessageW, GetMessageW, PostThreadMessageW, SetWindowsHookExW,
        TranslateMessage, UnhookWindowsHookEx, HHOOK, KBDLLHOOKSTRUCT, MSG, WH_KEYBOARD_LL,
        WM_QUIT,
    };

    static INSTALLED: AtomicBool = AtomicBool::new(false);
    static HOOK: AtomicIsize = AtomicIsize::new(0);
    static HOOK_THREAD: AtomicU32 = AtomicU32::new(0);

    // 音量键必须放行，否则用户无法调节音量。
    const VK_VOLUME_MUTE: u32 = 0xAD;
    const VK_VOLUME_DOWN: u32 = 0xAE;
    const VK_VOLUME_UP: u32 = 0xAF;

    unsafe extern "system" fn keyboard_proc(code: i32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
        if code >= 0 && super::is_blocking() {
            let event = &*(lparam as *const KBDLLHOOKSTRUCT);
            if !matches!(event.vkCode, VK_VOLUME_MUTE | VK_VOLUME_DOWN | VK_VOLUME_UP) {
                // 低级键盘钩子返回 1 表示吞掉该按键。
                return 1;
            }
        }

        CallNextHookEx(HHOOK::default(), code, wparam, lparam)
    }

    pub fn is_installed() -> bool {
        INSTALLED.load(Ordering::SeqCst)
    }

    pub fn start() -> Result<(), String> {
        if INSTALLED.load(Ordering::SeqCst) {
            super::set_blocking(true);
            return Ok(());
        }

        let (ready_tx, ready_rx) = mpsc::channel::<Result<(), String>>();

        std::thread::Builder::new()
            .name("hc-keyboard-hook".into())
            .spawn(move || unsafe {
                let hook =
                    SetWindowsHookExW(WH_KEYBOARD_LL, Some(keyboard_proc), HINSTANCE::default(), 0);
                if hook as isize == 0 {
                    let error = std::io::Error::last_os_error();
                    let _ = ready_tx.send(Err(format!("SetWindowsHookExW 失败: {error}")));
                    return;
                }

                HOOK.store(hook as isize, Ordering::SeqCst);
                HOOK_THREAD.store(GetCurrentThreadId(), Ordering::SeqCst);
                INSTALLED.store(true, Ordering::SeqCst);
                let _ = ready_tx.send(Ok(()));

                // 低级键盘钩子要求安装线程持续派发消息。
                let mut msg: MSG = std::mem::zeroed();
                while GetMessageW(&mut msg, HWND::default(), 0, 0) > 0 {
                    TranslateMessage(&msg);
                    DispatchMessageW(&msg);
                }

                let remaining = HOOK.swap(0, Ordering::SeqCst);
                if remaining != 0 {
                    UnhookWindowsHookEx(remaining as HHOOK);
                }
                INSTALLED.store(false, Ordering::SeqCst);
            })
            .map_err(|error| format!("创建键盘钩子线程失败: {error}"))?;

        ready_rx
            .recv_timeout(Duration::from_secs(3))
            .map_err(|_| "安装键盘钩子超时".to_string())??;

        super::set_blocking(true);
        Ok(())
    }

    pub fn stop() {
        if !INSTALLED.load(Ordering::SeqCst) {
            return;
        }

        let hook = HOOK.swap(0, Ordering::SeqCst);
        if hook != 0 {
            unsafe {
                UnhookWindowsHookEx(hook as HHOOK);
            }
        }

        let thread_id = HOOK_THREAD.swap(0, Ordering::SeqCst);
        if thread_id != 0 {
            unsafe {
                PostThreadMessageW(thread_id, WM_QUIT, 0, 0);
            }
        }

        INSTALLED.store(false, Ordering::SeqCst);
    }
}

#[cfg(not(target_os = "windows"))]
mod imp {
    pub fn is_installed() -> bool {
        false
    }

    pub fn start() -> Result<(), String> {
        Err("当前平台尚未实现全局键盘拦截（第一阶段仅支持 Windows）".to_string())
    }

    pub fn stop() {}
}
