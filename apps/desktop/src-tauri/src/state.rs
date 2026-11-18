use std::sync::atomic::AtomicU64;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// 锁屏窗口的运行参数，前端通过 `get_lock_config` 读取。
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

#[derive(Default)]
pub struct AppState {
    pub lock_config: Mutex<LockConfig>,
    /// 每次打开/关闭锁屏窗口递增，用于终止旧的置顶巡检线程。
    pub lock_generation: AtomicU64,
}
