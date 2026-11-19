import { invoke } from '@tauri-apps/api/core'

import type { LockConfig, RuntimeStatus } from '@/types/desktop'

/** 是否运行在 Tauri 容器内（浏览器预览时为 false） */
export function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export function getRuntimeStatus(): Promise<RuntimeStatus> {
  return invoke<RuntimeStatus>('get_runtime_status')
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
