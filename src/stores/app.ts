import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from '@tauri-apps/plugin-autostart'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'

import {
  getConfig,
  getRuntimeStatus,
  getSchedulerStatus,
  getStats,
  isDesktopRuntime,
  resetTodayStats,
  saveConfig,
  setKeyboardBlocking,
  skipReminder,
  snoozeReminder,
  startReminders,
  stopReminders,
} from '@/services/desktop'
import type {
  AppConfig,
  ReminderEvent,
  RuntimeStatus,
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
    notificationType: 'desktop',
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

export const useAppStore = defineStore('app', () => {
  const { show } = useToast()

  const config = ref<AppConfig>(defaultConfig())
  const stats = ref<StatsSummary>(emptyStats())
  const scheduler = ref<SchedulerStatus>({
    running: false,
    nextAt: null,
    nextAtIso: null,
    lockOpen: false,
  })
  const runtime = ref<RuntimeStatus>({
    blocking: false,
    hookInstalled: false,
    platformSupported: desktop,
    platform: desktop ? 'unknown' : 'web',
  })
  const autoLaunch = ref(false)
  const loading = ref(false)
  const now = ref(Date.now())

  let initialized = false
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

    if (!desktop) return

    await Promise.all([loadConfig(), loadStats(), loadStatus(), loadRuntime()])
    await loadAutostart()
    await setupListeners()

    window.setInterval(() => {
      void loadStats()
      void loadStatus()
    }, 20_000)
  }

  async function setupListeners(): Promise<void> {
    unlisteners.push(
      await listen<SchedulerStatus>('scheduler-status', (event) => {
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

  async function loadStatus(): Promise<void> {
    try {
      scheduler.value = await getSchedulerStatus()
    } catch (cause) {
      console.warn('[app] 读取调度状态失败', cause)
    }
  }

  async function loadRuntime(): Promise<void> {
    try {
      runtime.value = await getRuntimeStatus()
    } catch (cause) {
      console.warn('[app] 读取运行状态失败', cause)
    }
  }

  async function loadAutostart(): Promise<void> {
    try {
      autoLaunch.value = await isAutostartEnabled()
    } catch (cause) {
      console.warn('[app] 读取开机自启失败', cause)
    }
  }

  async function patchConfig(patch: Partial<AppConfig>): Promise<boolean> {
    loading.value = true
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
      config.value = await saveConfig(next)
      await loadStatus()
      return true
    } catch (cause) {
      show(`保存设置失败：${describeError(cause)}`, 'danger')
      return false
    } finally {
      loading.value = false
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
    if (!desktop) return
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
    if (!desktop) return
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
    try {
      await snoozeReminder(minutes)
      await loadStatus()
      show(`已稍后 ${minutes} 分钟`, 'ok')
    } catch (cause) {
      show(`稍后提醒失败：${describeError(cause)}`, 'danger')
    }
  }

  async function skip(): Promise<void> {
    try {
      await skipReminder()
      await loadStatus()
      show('已跳过本次提醒', 'info')
    } catch (cause) {
      show(`跳过提醒失败：${describeError(cause)}`, 'danger')
    }
  }

  async function resetToday(): Promise<void> {
    try {
      stats.value = await resetTodayStats()
      show('今日统计已重置', 'ok')
    } catch (cause) {
      show(`重置统计失败：${describeError(cause)}`, 'danger')
    }
  }

  async function toggleAutostart(): Promise<void> {
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

  async function toggleKeyboard(): Promise<void> {
    try {
      await setKeyboardBlocking(!runtime.value.blocking)
      await loadRuntime()
    } catch (cause) {
      show(`切换键盘拦截失败：${describeError(cause)}`, 'danger')
    }
  }

  async function testNotification(): Promise<void> {
    if (!(await ensureNotificationPermission())) {
      show('通知权限被拒绝，请在系统设置中允许', 'danger')
      return
    }
    sendNotification({
      title: '🔔 测试通知',
      body: '如果你看到这条消息，说明桌面通知已开启！',
    })
    show('测试通知已发送', 'ok')
  }

  function playAlert(): void {
    try {
      const audio = new Audio('/audio/alert.wav')
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
    scheduler,
    runtime,
    autoLaunch,
    loading,
    now,
    remainingSeconds,
    countdownLabel,
    nextTimeLabel,
    statusLabel,
    modeLabel,
    init,
    loadConfig,
    loadStats,
    loadStatus,
    loadRuntime,
    patchConfig,
    start,
    stop,
    snooze,
    skip,
    resetToday,
    toggleAutostart,
    toggleKeyboard,
    testNotification,
    ensureNotificationPermission,
  }
})
