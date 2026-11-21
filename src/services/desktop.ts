import { invoke } from '@tauri-apps/api/core'

import type {
  AppConfig,
  LockConfig,
  RuntimeStatus,
  SchedulerStatus,
  StatsSummary,
} from '@/types/desktop'

/** 是否运行在 Tauri 容器内（浏览器预览时为 false） */
export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getRuntimeStatus(): Promise<RuntimeStatus> {
  return invoke<RuntimeStatus>('get_runtime_status')
}

export function getConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('get_config')
}

export function saveConfig(config: AppConfig): Promise<AppConfig> {
  return invoke<AppConfig>('save_config', { config })
}

export function getStats(): Promise<StatsSummary> {
  return invoke<StatsSummary>('get_stats')
}

export function resetTodayStats(): Promise<StatsSummary> {
  return invoke<StatsSummary>('reset_today_stats')
}

export function getSchedulerStatus(): Promise<SchedulerStatus> {
  return invoke<SchedulerStatus>('get_scheduler_status')
}

export function startReminders(): Promise<void> {
  return invoke<void>('start_reminders')
}

export function stopReminders(): Promise<void> {
  return invoke<void>('stop_reminders')
}

export function snoozeReminder(minutes: number): Promise<void> {
  return invoke<void>('snooze_reminder', { minutes })
}

export function skipReminder(): Promise<void> {
  return invoke<void>('skip_reminder')
}

export function completeLock(): Promise<void> {
  return invoke<void>('complete_lock')
}

export function getLockConfig(): Promise<LockConfig> {
  return invoke<LockConfig>('get_lock_config')
}

export function setKeyboardBlocking(enabled: boolean): Promise<void> {
  return invoke<void>('set_keyboard_blocking', { enabled })
}

export function openLockWindow(durationSecs: number, forceLock = false): Promise<void> {
  return invoke<void>('open_lock_window', { durationSecs, forceLock })
}

export function closeLockWindow(): Promise<void> {
  return invoke<void>('close_lock_window')
}

export function openMainWindow(): Promise<void> {
  return invoke<void>('open_main_window')
}

export function quitApp(): Promise<void> {
  return invoke<void>('quit_app')
}
