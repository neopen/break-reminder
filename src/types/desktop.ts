export type NotificationType = 'desktop' | 'lock'

export interface TimeRange {
  start: string
  end: string
}

export interface CustomBreak {
  name: string
  start: string
  end: string
}

export interface DoNotDisturb {
  enabled: boolean
  lunchBreak: TimeRange
  customBreaks: CustomBreak[]
}

/** 与 Rust 侧 AppConfig 一一对应 */
export interface AppConfig {
  startTime: string
  endTime: string
  intervalMinutes: number
  lockMinutes: number
  forceLock: boolean
  systemLock: boolean
  soundEnabled: boolean
  notificationType: NotificationType
  /** 开机或休眠唤醒后自动开启提醒 */
  autoStartReminders: boolean
  doNotDisturb: DoNotDisturb
  [key: string]: unknown
}

/** 与 Rust 侧 StatsSummary 一一对应 */
export interface StatsSummary {
  todayCount: number
  continuousDays: number
  weeklyRate: number
  weeklyCount: number
  weeklyTarget: number
  dailyTarget: number
}

/** 单日打卡记录，用于今日统计图与打卡日历 */
export interface DailyRecord {
  date: string
  count: number
}

/** 与 Rust 侧 SchedulerStatus 一一对应 */
export interface SchedulerStatus {
  running: boolean
  nextAt: string | null
  nextAtIso: string | null
  lockOpen: boolean
}

/** 调度器触发提醒时广播的事件 */
export interface ReminderEvent {
  mode: NotificationType
  soundEnabled: boolean
}

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
