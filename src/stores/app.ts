import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import alertAudioUrl from '../../assets/audio/alert.wav'

import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from '@tauri-apps/plugin-autostart'
import { isPermissionGranted, requestPermission } from '@tauri-apps/plugin-notification'

import {
  getConfig,
  getDailyRecords,
  getSchedulerStatus,
  getStats,
  isDesktopRuntime,
  resetTodayStats,
  saveConfig,
  skipReminder,
  snoozeReminder,
  startReminders,
  stopReminders,
} from '@/services/desktop'
import type {
  AppConfig,
  DailyRecord,
  ReminderEvent,
  SchedulerStatus,
  StatsSummary,
} from '@/types/desktop'
import { describeError } from '@/utils/error'

import { useToast } from '@/composables/useToast'

const desktop = isDesktopRuntime()

function defaultConfig(): AppConfig {
  return {
    startTime: '08:00',
    endTime: '18:00',
    intervalMinutes: 40,
    lockMinutes: 5,
    forceLock: true,
    systemLock: false,
    soundEnabled: true,
    notificationType: 'lock',
    autoStartReminders: true,
    doNotDisturb: {
      enabled: true,
      lunchBreak: { start: '12:00', end: '14:00' },
      customBreaks: [],
    },
  }
}

function emptyStats(): StatsSummary {
  return {
    todayCount: 0,
    continuousDays: 0,
    weeklyRate: 0,
    weeklyCount: 0,
    weeklyTarget: 40,
    dailyTarget: 8,
  }
}

/** 浏览器预览没有 Rust 后端，生成近 400 天的演示打卡记录 */
function demoHistory(): DailyRecord[] {
  const records: DailyRecord[] = []
  const today = new Date()

  for (let offset = 400; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')

    let count = 0
    if (offset === 0) count = 5
    else if (offset <= 12) count = 3 + (offset % 4)
    else if (offset % 4 !== 0) count = 2 + ((offset * 3) % 6)

    if (count > 0) records.push({ date: key, count })
  }

  return records
}

/** 浏览器预览没有 Rust 后端，用演示数据展示完整界面 */
function demoStats(): StatsSummary {
  return {
    todayCount: 5,
    continuousDays: 12,
    weeklyRate: 78,
    weeklyCount: 31,
    weeklyTarget: 40,
    dailyTarget: 8,
  }
}

export const useAppStore = defineStore('app', () => {
  const { show } = useToast()

  const config = ref<AppConfig>(defaultConfig())
  const stats = ref<StatsSummary>(desktop ? emptyStats() : demoStats())
  const history = ref<DailyRecord[]>([])
  const scheduler = ref<SchedulerStatus>({
    running: false,
    nextAt: null,
    nextAtIso: null,
    lockOpen: false,
  })
  // 浏览器预览默认展示“开机启动已开启”，与正式版首次运行的默认行为一致
  const autoLaunch = ref(!desktop)
  const loading = ref(false)
  const saving = ref(false)
  const saved = ref(false)
  const now = ref(Date.now())

  let initialized = false
  let savedTimer: number | undefined
  const unlisteners: UnlistenFn[] = []

  const remainingSeconds = computed(() => {
    if (!scheduler.value.running || !scheduler.value.nextAtIso) return null
    const target = new Date(scheduler.value.nextAtIso).getTime()
    if (Number.isNaN(target)) return null
    return Math.max(0, Math.floor((target - now.value) / 1000))
  })

  const countdownLabel = computed(() => {
    const seconds = remainingSeconds.value
    if (seconds === null) return '--:--:--'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const rest = seconds % 60
    return [hours, minutes, rest].map((value) => String(value).padStart(2, '0')).join(':')
  })

  const nextTimeLabel = computed(() => scheduler.value.nextAt ?? '--:--:--')

  const statusLabel = computed(() => (scheduler.value.running ? '提醒运行中' : '提醒未启动'))

  const modeLabel = computed(() =>
    config.value.notificationType === 'desktop' ? '桌面通知' : '锁屏通知',
  )

  async function init(): Promise<void> {
    if (initialized) return
    initialized = true

    window.setInterval(() => {
      now.value = Date.now()
    }, 1000)

    // 休眠/最小化期间定时器可能被节流，回到前台时立即校准倒计时。
    window.addEventListener('focus', () => {
      now.value = Date.now()
    })
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) now.value = Date.now()
    })

    if (!desktop) return

    await Promise.all([loadConfig(), loadStats(), loadStatus()])
    await loadAutostart()
    await setupListeners()

    // 后端可能在启动时已自动开启提醒，确保桌面通知权限就绪。
    if (
      config.value.notificationType === 'desktop' &&
      (scheduler.value.running || config.value.autoStartReminders)
    ) {
      void ensureNotificationPermission()
    }

    window.setInterval(() => {
      void loadStats()
      void loadStatus()
    }, 20_000)
  }

  async function setupListeners(): Promise<void> {
    unlisteners.push(
      await listen<SchedulerStatus>('scheduler-status', (event) => {
        // 后端在唤醒后会重置下次时间，同步校准前端时钟。
        now.value = Date.now()
        scheduler.value = event.payload
      }),
    )
    unlisteners.push(
      await listen<StatsSummary>('stats-updated', (event) => {
        stats.value = event.payload
      }),
    )
    unlisteners.push(
      await listen<ReminderEvent>('reminder-due', (event) => {
        void handleReminder(event.payload)
      }),
    )
  }

  async function loadConfig(): Promise<void> {
    try {
      config.value = await getConfig()
    } catch (cause) {
      show(`读取设置失败：${describeError(cause)}`, 'danger')
    }
  }

  async function loadStats(): Promise<void> {
    try {
      stats.value = await getStats()
    } catch (cause) {
      console.warn('[app] 读取统计失败', cause)
    }
  }

  /** 打开统计图或打卡日历时调用，获取最近两年的每日记录 */
  async function loadHistory(): Promise<void> {
    if (!desktop) {
      history.value = demoHistory()
      return
    }

    try {
      history.value = await getDailyRecords()
    } catch (cause) {
      show(`读取打卡记录失败：${describeError(cause)}`, 'danger')
    }
  }

  async function loadStatus(): Promise<void> {
    try {
      scheduler.value = await getSchedulerStatus()
    } catch (cause) {
      console.warn('[app] 读取调度状态失败', cause)
    }
  }

  async function loadAutostart(): Promise<void> {
    try {
      autoLaunch.value = await isAutostartEnabled()
    } catch (cause) {
      console.warn('[app] 读取开机自启失败', cause)
    }
  }

  function flashSaved(): void {
    saved.value = true
    if (savedTimer) window.clearTimeout(savedTimer)
    savedTimer = window.setTimeout(() => {
      saved.value = false
    }, 1800)
  }

  /** 浏览器预览下用本地调度状态模拟提醒倒计时 */
  function scheduleLocalReminder(minutes: number): void {
    const target = new Date(Date.now() + minutes * 60_000)
    scheduler.value = {
      running: true,
      nextAt: target.toTimeString().slice(0, 8),
      nextAtIso: target.toISOString(),
      lockOpen: false,
    }
  }

  async function patchConfig(patch: Partial<AppConfig>): Promise<boolean> {
    saving.value = true
    saved.value = false
    try {
      const next: AppConfig = {
        ...config.value,
        ...patch,
      }
      if (patch.doNotDisturb) {
        next.doNotDisturb = {
          ...patch.doNotDisturb,
          lunchBreak: { ...patch.doNotDisturb.lunchBreak },
          customBreaks: patch.doNotDisturb.customBreaks.map((item) => ({ ...item })),
        }
      }

      if (!desktop) {
        config.value = next
        flashSaved()
        return true
      }

      config.value = await saveConfig(next)
      await loadStatus()
      flashSaved()
      return true
    } catch (cause) {
      show(`保存设置失败：${describeError(cause)}`, 'danger')
      return false
    } finally {
      saving.value = false
    }
  }

  async function ensureNotificationPermission(): Promise<boolean> {
    if (!desktop) return false
    try {
      if (await isPermissionGranted()) return true
      return (await requestPermission()) === 'granted'
    } catch (cause) {
      console.warn('[app] 通知权限请求失败', cause)
      return false
    }
  }

  async function start(): Promise<void> {
    if (!desktop) {
      scheduleLocalReminder(config.value.intervalMinutes)
      show(`预览模式：提醒已启动，下次提醒 ${scheduler.value.nextAt ?? '--:--:--'}`, 'ok')
      return
    }
    loading.value = true
    try {
      if (config.value.notificationType === 'desktop') {
        const granted = await ensureNotificationPermission()
        if (!granted) {
          show('未获得通知权限，提醒仍会启动但不会弹出系统通知', 'warn')
        }
      }
      await startReminders()
      await loadStatus()
      show(`提醒已启动，下次提醒 ${scheduler.value.nextAt ?? '--:--:--'}`, 'ok')
    } catch (cause) {
      show(`启动提醒失败：${describeError(cause)}`, 'danger')
    } finally {
      loading.value = false
    }
  }

  async function stop(): Promise<void> {
    if (!desktop) {
      scheduler.value = { running: false, nextAt: null, nextAtIso: null, lockOpen: false }
      show('预览模式：提醒已停止', 'info')
      return
    }
    loading.value = true
    try {
      await stopReminders()
      await loadStatus()
      show('提醒已停止，记得定时起来活动哦！', 'info')
    } catch (cause) {
      show(`停止提醒失败：${describeError(cause)}`, 'danger')
    } finally {
      loading.value = false
    }
  }

  async function snooze(minutes: number): Promise<void> {
    if (!desktop) {
      if (scheduler.value.running) scheduleLocalReminder(minutes)
      show(`已稍后 ${minutes} 分钟`, 'ok')
      return
    }
    try {
      await snoozeReminder(minutes)
      await loadStatus()
      show(`已稍后 ${minutes} 分钟`, 'ok')
    } catch (cause) {
      show(`稍后提醒失败：${describeError(cause)}`, 'danger')
    }
  }

  async function skip(): Promise<void> {
    if (!desktop) {
      if (scheduler.value.running) scheduleLocalReminder(config.value.intervalMinutes)
      show('已跳过本次提醒', 'info')
      return
    }
    try {
      await skipReminder()
      await loadStatus()
      show('已跳过本次提醒', 'info')
    } catch (cause) {
      show(`跳过提醒失败：${describeError(cause)}`, 'danger')
    }
  }

  async function resetToday(): Promise<void> {
    if (!desktop) {
      stats.value = { ...stats.value, todayCount: 0 }
      show('今日统计已重置', 'ok')
      return
    }
    try {
      stats.value = await resetTodayStats()
      show('今日统计已重置', 'ok')
    } catch (cause) {
      show(`重置统计失败：${describeError(cause)}`, 'danger')
    }
  }

  async function toggleAutostart(): Promise<void> {
    if (!desktop) {
      autoLaunch.value = !autoLaunch.value
      show(autoLaunch.value ? '已开启开机启动' : '已关闭开机启动', autoLaunch.value ? 'ok' : 'info')
      return
    }
    try {
      if (autoLaunch.value) {
        await disableAutostart()
        autoLaunch.value = false
        show('已关闭开机启动', 'info')
      } else {
        await enableAutostart()
        autoLaunch.value = true
        show('已开启开机启动', 'ok')
      }
    } catch (cause) {
      show(`设置开机启动失败：${describeError(cause)}`, 'danger')
    }
  }

  function playAlert(): void {
    try {
      const audio = new Audio(alertAudioUrl)
      audio.volume = 0.7
      void audio.play().catch(() => undefined)
    } catch (cause) {
      console.warn('[app] 播放提醒音效失败', cause)
    }
  }

  async function handleReminder(event: ReminderEvent): Promise<void> {
    if (event.mode !== 'desktop') return

    if (event.soundEnabled) {
      playAlert()
    }

    show('该活动啦！站起来走走，伸个懒腰。', 'info', 5000)
    await loadStats()
    await loadStatus()
  }

  return {
    desktop,
    config,
    stats,
    history,
    scheduler,
    autoLaunch,
    loading,
    saving,
    saved,
    now,
    remainingSeconds,
    countdownLabel,
    nextTimeLabel,
    statusLabel,
    modeLabel,
    init,
    loadConfig,
    loadStats,
    loadHistory,
    loadStatus,
    patchConfig,
    start,
    stop,
    snooze,
    skip,
    resetToday,
    toggleAutostart,
    ensureNotificationPermission,
  }
})
