use std::sync::atomic::Ordering;
use std::time::Duration as StdDuration;

use chrono::{DateTime, Duration, Local};
use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

use crate::config::{AppConfig, NotificationType};
use crate::lock;
use crate::state::{AppState, LockOutcome};
use crate::stats::Stats;
use crate::store;

const MAX_SLEEP_MS: i64 = 5 * 60 * 1000;
/// 实际经过时间明显超过计划睡眠时间，视为系统休眠/挂起过。
const RESUME_GAP_MS: i64 = 30 * 1000;
/// 休眠检测轮询间隔；即使提醒未运行也能感知唤醒。
const RESUME_WATCH_INTERVAL: StdDuration = StdDuration::from_secs(5);

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SchedulerStatus {
    pub running: bool,
    pub next_at: Option<String>,
    pub next_at_iso: Option<String>,
    pub lock_open: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReminderEvent {
    pub mode: String,
    pub sound_enabled: bool,
}

pub fn status(app: &AppHandle) -> SchedulerStatus {
    let state = app.state::<AppState>();
    let next = state.scheduler.next_at.lock().ok().and_then(|slot| *slot);

    SchedulerStatus {
        running: state.scheduler.running.load(Ordering::SeqCst),
        next_at: next
            .as_ref()
            .map(|value| value.format("%H:%M:%S").to_string()),
        next_at_iso: next.map(|value| value.to_rfc3339()),
        lock_open: app.get_webview_window("lock").is_some(),
    }
}

pub fn emit_status(app: &AppHandle) {
    let _ = app.emit("scheduler-status", status(app));
}

pub fn start(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    if state.scheduler.running.swap(true, Ordering::SeqCst) {
        emit_status(app);
        return Ok(());
    }

    state
        .scheduler
        .resume_reminder
        .store(false, Ordering::SeqCst);

    let config = state
        .config
        .lock()
        .map_err(|_| "配置状态已损坏".to_string())?
        .clone();
    let next = config.next_reminder_after(Local::now());
    *state
        .scheduler
        .next_at
        .lock()
        .map_err(|_| "调度状态已损坏".to_string())? = Some(next);

    let generation = state.scheduler.generation.fetch_add(1, Ordering::SeqCst) + 1;
    emit_status(app);
    spawn_loop(app.clone(), generation);
    Ok(())
}

pub fn stop(app: &AppHandle) {
    let state = app.state::<AppState>();
    state.scheduler.running.store(false, Ordering::SeqCst);
    state
        .scheduler
        .resume_reminder
        .store(false, Ordering::SeqCst);
    state.scheduler.generation.fetch_add(1, Ordering::SeqCst);

    if let Ok(mut slot) = state.scheduler.next_at.lock() {
        *slot = None;
    }
    if let Some(sender) = take_lock_sender(app) {
        let _ = sender.send(LockOutcome::Skipped);
    }

    lock::close(app);
    emit_status(app);
}

pub fn apply_config(app: &AppHandle, config: AppConfig) -> Result<AppConfig, String> {
    let normalized = config.normalize();

    {
        let state = app.state::<AppState>();
        *state
            .config
            .lock()
            .map_err(|_| "配置状态已损坏".to_string())? = normalized.clone();
    }

    let paths = store::init(app)?;
    store::save_config(&paths.config, &normalized)?;

    // 调整参数后重新开始计时，让新设置立即生效。
    let state = app.state::<AppState>();
    state
        .scheduler
        .resume_reminder
        .store(false, Ordering::SeqCst);
    if state.scheduler.running.load(Ordering::SeqCst) {
        schedule_next(app, &normalized, Local::now());
    } else {
        emit_status(app);
    }

    Ok(normalized)
}

pub fn snooze(app: &AppHandle, minutes: u32) -> Result<(), String> {
    let minutes = minutes.clamp(1, 120);
    let state = app.state::<AppState>();
    if !state.scheduler.running.load(Ordering::SeqCst) {
        return Err("提醒尚未启动".to_string());
    }

    if app.get_webview_window("lock").is_some() {
        let force = state
            .lock_config
            .lock()
            .map(|config| config.force_lock)
            .unwrap_or(false);
        if force {
            return Err("强制锁屏期间无法稍后提醒".to_string());
        }

        if let Some(sender) = take_lock_sender(app) {
            let _ = sender.send(LockOutcome::Snoozed(minutes));
        }
        lock::close(app);
        return Ok(());
    }

    set_next(app, Local::now() + Duration::minutes(minutes as i64));
    Ok(())
}

pub fn skip(app: &AppHandle) -> Result<(), String> {
    let state = app.state::<AppState>();
    if !state.scheduler.running.load(Ordering::SeqCst) {
        return Err("提醒尚未启动".to_string());
    }

    if app.get_webview_window("lock").is_some() {
        let force = state
            .lock_config
            .lock()
            .map(|config| config.force_lock)
            .unwrap_or(false);
        if force {
            return Err("强制锁屏期间无法跳过".to_string());
        }

        if let Some(sender) = take_lock_sender(app) {
            let _ = sender.send(LockOutcome::Skipped);
        }
        lock::close(app);
        return Ok(());
    }

    let config = state
        .config
        .lock()
        .map_err(|_| "配置状态已损坏".to_string())?
        .clone();
    schedule_next(app, &config, Local::now());
    Ok(())
}

pub fn resolve_lock(app: &AppHandle, outcome: LockOutcome) {
    if let Some(sender) = take_lock_sender(app) {
        let _ = sender.send(outcome);
    }
    lock::close(app);
    emit_status(app);
}

pub fn on_lock_destroyed(app: &AppHandle) {
    if let Some(sender) = take_lock_sender(app) {
        let _ = sender.send(LockOutcome::Skipped);
    }
}

pub fn record_activity(app: &AppHandle) {
    let state = app.state::<AppState>();
    let (summary, snapshot) = {
        let Ok(mut stats) = state.stats.lock() else {
            return;
        };
        let now = Local::now();
        stats.rollover(now);
        stats.record_activity(now);
        (stats.summary(now), stats.clone())
    };

    save_stats(app, &snapshot);
    let _ = app.emit("stats-updated", summary);
    emit_status(app);
}

pub fn refresh_stats(app: &AppHandle) -> crate::stats::StatsSummary {
    let state = app.state::<AppState>();
    let (summary, changed, snapshot) = {
        let Ok(mut stats) = state.stats.lock() else {
            let now = Local::now();
            return Stats::default().summary(now);
        };
        let now = Local::now();
        let mut changed = stats.rollover(now);
        changed |= stats.fix_streak(now);
        (stats.summary(now), changed, stats.clone())
    };

    if changed {
        save_stats(app, &snapshot);
    }
    summary
}

pub fn daily_records(app: &AppHandle) -> Vec<crate::stats::DailyRecord> {
    let state = app.state::<AppState>();
    let Ok(stats) = state.stats.lock() else {
        return Vec::new();
    };
    stats.recent_daily_records(Local::now(), 730)
}

pub fn reset_today(app: &AppHandle) -> crate::stats::StatsSummary {
    let state = app.state::<AppState>();
    let (summary, snapshot) = {
        let Ok(mut stats) = state.stats.lock() else {
            let now = Local::now();
            return Stats::default().summary(now);
        };
        let now = Local::now();
        stats.reset_today(now);
        (stats.summary(now), stats.clone())
    };

    save_stats(app, &snapshot);
    let _ = app.emit("stats-updated", summary.clone());
    summary
}

/// 监听系统休眠：唤醒后重新开始计时；若开启自启动提醒则自动恢复运行。
pub fn spawn_resume_watcher(app: AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut last_tick = Local::now();

        loop {
            tokio::time::sleep(RESUME_WATCH_INTERVAL).await;
            let now = Local::now();
            let gap = (now - last_tick).num_milliseconds();
            last_tick = now;

            if gap > RESUME_GAP_MS {
                handle_resume(&app);
            }
        }
    });
}

fn handle_resume(app: &AppHandle) {
    let config = current_config(app);
    let running = app
        .state::<AppState>()
        .scheduler
        .running
        .load(Ordering::SeqCst);

    if running {
        // 休眠时间不计入提醒间隔，从唤醒时刻重新计时。
        restart_interval(app, &config, Local::now());
    } else if config.auto_start_reminders {
        if let Err(error) = start(app) {
            eprintln!("[scheduler] 休眠唤醒后自动启动提醒失败: {error}");
        } else {
            restart_interval(app, &config, Local::now());
        }
    }
}

/// 休眠唤醒后从当前时刻重新开始一个完整间隔；首个提醒不再跳转到下一个工作时段。
fn restart_interval(app: &AppHandle, config: &AppConfig, from: DateTime<Local>) {
    set_next(
        app,
        from + Duration::minutes(config.interval_minutes as i64),
    );
    app.state::<AppState>()
        .scheduler
        .resume_reminder
        .store(true, Ordering::SeqCst);
}

fn current_config(app: &AppHandle) -> AppConfig {
    app.state::<AppState>()
        .config
        .lock()
        .map(|config| config.clone())
        .unwrap_or_default()
}

fn spawn_loop(app: AppHandle, generation: u64) {
    tauri::async_runtime::spawn(async move {
        run_loop(app, generation).await;
    });
}

async fn run_loop(app: AppHandle, generation: u64) {
    loop {
        let (running, current, next) = {
            let state = app.state::<AppState>();
            (
                state.scheduler.running.load(Ordering::SeqCst),
                state.scheduler.generation.load(Ordering::SeqCst),
                state.scheduler.next_at.lock().ok().and_then(|slot| *slot),
            )
        };

        if !running || current != generation {
            break;
        }
        let Some(next) = next else {
            break;
        };

        let sleep_started = Local::now();
        let wait_ms = (next - sleep_started)
            .num_milliseconds()
            .clamp(0, MAX_SLEEP_MS);
        tokio::time::sleep(StdDuration::from_millis((wait_ms + 50) as u64)).await;
        let woke_at = Local::now();

        let (running, current, latest_next) = {
            let state = app.state::<AppState>();
            (
                state.scheduler.running.load(Ordering::SeqCst),
                state.scheduler.generation.load(Ordering::SeqCst),
                state.scheduler.next_at.lock().ok().and_then(|slot| *slot),
            )
        };
        if !running || current != generation {
            break;
        }

        // 休眠期间计时暂停：唤醒后不补发提醒，直接重新开始一个完整间隔。
        if (woke_at - sleep_started).num_milliseconds() > wait_ms + RESUME_GAP_MS {
            let config = current_config(&app);
            restart_interval(&app, &config, woke_at);
            continue;
        }

        // 稍后提醒、跳过或唤醒重置会改写下次时间，避免按旧计划误触发。
        if latest_next != Some(next) {
            continue;
        }
        if Local::now() < next {
            continue;
        }

        let config = current_config(&app);
        let now = Local::now();
        // 休眠唤醒后的首个提醒允许越过工作时段检查，确保重新开始的间隔能按时触发。
        let resume_reminder = app
            .state::<AppState>()
            .scheduler
            .resume_reminder
            .swap(false, Ordering::SeqCst);

        if config.do_not_disturb.is_active(now.time()) {
            schedule_next(&app, &config, now);
            continue;
        }

        if !resume_reminder && !config.is_within_work_window(now) {
            schedule_next(&app, &config, now);
            continue;
        }

        match config.notification_type {
            NotificationType::Desktop => {
                record_activity(&app);
                if let Err(error) = app
                    .notification()
                    .builder()
                    .title("🧘 该活动啦！")
                    .body("站起来走走，伸个懒腰，活动一下筋骨吧！")
                    .show()
                {
                    eprintln!("[scheduler] 发送桌面通知失败: {error}");
                }
                let _ = app.emit(
                    "reminder-due",
                    ReminderEvent {
                        mode: "desktop".to_string(),
                        sound_enabled: config.sound_enabled,
                    },
                );
                schedule_next(&app, &config, Local::now());
            }
            NotificationType::Lock => {
                let duration = config.lock_minutes.clamp(1, 30).saturating_mul(60) as u64;
                let outcome = run_lock(&app, duration, config.force_lock).await;

                match outcome {
                    LockOutcome::Completed => {
                        record_activity(&app);
                        if config.system_lock {
                            lock_system();
                        }
                        schedule_next(&app, &config, Local::now());
                    }
                    LockOutcome::Snoozed(minutes) => {
                        set_next(
                            &app,
                            Local::now() + Duration::minutes(minutes.clamp(1, 120) as i64),
                        );
                    }
                    LockOutcome::Skipped => {
                        schedule_next(&app, &config, Local::now());
                    }
                }
            }
        }
    }
}

async fn run_lock(app: &AppHandle, duration_secs: u64, force_lock: bool) -> LockOutcome {
    let (sender, receiver) = tokio::sync::oneshot::channel();

    store_lock_sender(app, sender);

    if let Err(error) = lock::open(app, duration_secs, force_lock) {
        eprintln!("[scheduler] 打开锁屏失败: {error}");
        let _ = take_lock_sender(app);
        return LockOutcome::Skipped;
    }

    let result = tokio::time::timeout(StdDuration::from_secs(duration_secs + 5), receiver).await;
    let outcome = match result {
        Ok(Ok(value)) => value,
        _ => LockOutcome::Completed,
    };

    lock::close(app);
    outcome
}

fn schedule_next(app: &AppHandle, config: &AppConfig, from: DateTime<Local>) {
    set_next(app, config.next_reminder_after(from));
}

fn set_next(app: &AppHandle, next: DateTime<Local>) {
    let state = app.state::<AppState>();
    if let Ok(mut slot) = state.scheduler.next_at.lock() {
        *slot = Some(next);
    }
    emit_status(app);
}

fn take_lock_sender(app: &AppHandle) -> Option<tokio::sync::oneshot::Sender<LockOutcome>> {
    let state = app.state::<AppState>();
    let mut slot = state.scheduler.lock_tx.lock().ok()?;
    slot.take()
}

fn store_lock_sender(app: &AppHandle, sender: tokio::sync::oneshot::Sender<LockOutcome>) {
    let state = app.state::<AppState>();
    let mut slot = match state.scheduler.lock_tx.lock() {
        Ok(slot) => slot,
        Err(_) => return,
    };
    *slot = Some(sender);
}

fn save_stats(app: &AppHandle, stats: &Stats) {
    match store::init(app) {
        Ok(paths) => {
            if let Err(error) = store::save_stats(&paths.stats, stats) {
                eprintln!("[scheduler] 保存统计失败: {error}");
            }
        }
        Err(error) => eprintln!("[scheduler] 初始化存储失败: {error}"),
    }
}

fn lock_system() {
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("rundll32.exe")
            .args(["user32.dll,LockWorkStation"])
            .status();
    }

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("pmset")
            .args(["displaysleepnow"])
            .status();
    }

    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("gnome-screensaver-command")
            .arg("-l")
            .status();
    }
}
