use std::sync::atomic::{AtomicBool, AtomicU64};
use std::sync::Mutex;

use chrono::{DateTime, Local};
use serde::{Deserialize, Serialize};
use tokio::sync::oneshot;

use crate::config::AppConfig;
use crate::stats::Stats;

/// 锁屏窗口的运行参数，锁屏页通过命令读取。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LockConfig {
    pub duration_secs: u64,
    pub force_lock: bool,
}

impl Default for LockConfig {
    fn default() -> Self {
        Self {
            duration_secs: 60,
            force_lock: false,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LockOutcome {
    Completed,
    Snoozed(u32),
    Skipped,
}

#[derive(Default)]
pub struct SchedulerState {
    pub running: AtomicBool,
    pub generation: AtomicU64,
    pub next_at: Mutex<Option<DateTime<Local>>>,
    pub lock_tx: Mutex<Option<oneshot::Sender<LockOutcome>>>,
    /// 休眠唤醒后重新开始的第一个间隔，允许提醒不受工作时段限制。
    pub resume_reminder: AtomicBool,
}

#[derive(Default)]
pub struct AppState {
    pub config: Mutex<AppConfig>,
    pub stats: Mutex<Stats>,
    pub scheduler: SchedulerState,
    pub lock_config: Mutex<LockConfig>,
    /// 每次打开/关闭锁屏窗口递增，用于终止旧的置顶巡检线程。
    pub lock_generation: AtomicU64,
    pub quitting: AtomicBool,
}
