/** 与 Rust 侧 RuntimeStatus 一一对应 */
export interface RuntimeStatus {
  blocking: boolean
  hookInstalled: boolean
  platformSupported: boolean
  platform: string
}

/** 与 Rust 侧 LockConfig 一一对应 */
export interface LockConfig {
  durationSecs: number
  forceLock: boolean
}

/** 锁屏窗口通过 Tauri event 回传的音频自动播放结果 */
export interface AudioAutoplayPayload {
  ok: boolean
  detail: string
  playedCount: number
}
