<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import alertAudioUrl from '../../assets/audio/alert.wav'

import LockBackdrop from '@/components/product/LockBackdrop.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useConfirm } from '@/composables/useConfirm'
import {
  closeLockWindow,
  completeLock,
  getConfig,
  getLockConfig,
  isDesktopRuntime,
  skipReminder,
  snoozeReminder,
} from '@/services/desktop'
import type { LockConfig } from '@/types/desktop'

const lockConfig = ref<LockConfig>({ durationSecs: 60, forceLock: false })
const soundEnabled = ref(true)
const remaining = ref(60)
const total = ref(60)
const finished = ref(false)

const { confirm } = useConfirm()

const LOCK_DEADLINE_KEY = 'breakly:lock-deadline'
const LOCK_TOTAL_KEY = 'breakly:lock-total'

let tickTimer: number | undefined
let toneTimer: number | undefined
let deadlineTimer: number | undefined
let audio: HTMLAudioElement | null = null

const circumference = 2 * Math.PI * 120
const elapsedRatio = computed(() =>
  total.value > 0 ? (total.value - remaining.value) / total.value : 0,
)
const dashOffset = computed(() => circumference * (1 - elapsedRatio.value))
const timeText = computed(() => {
  const minutes = Math.floor(remaining.value / 60)
  const seconds = remaining.value % 60
  return `${pad(minutes)}:${pad(seconds)}`
})
const primaryLabel = computed(() =>
  lockConfig.value.forceLock
    ? `⏳ 请等待 ${remaining.value} 秒`
    : `⏳ 请活动 ${remaining.value} 秒`,
)

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function stopTimers(): void {
  if (tickTimer) window.clearInterval(tickTimer)
  if (toneTimer) window.clearInterval(toneTimer)
  if (deadlineTimer) window.clearTimeout(deadlineTimer)
  tickTimer = undefined
  toneTimer = undefined
  deadlineTimer = undefined
}

/** 通过 sessionStorage 记录倒计时截止时刻，页面意外重载后可以接着走。 */
function persistDeadline(secs: number): void {
  try {
    window.sessionStorage.setItem(LOCK_DEADLINE_KEY, String(Date.now() + secs * 1000))
    window.sessionStorage.setItem(LOCK_TOTAL_KEY, String(secs))
  } catch {
    // 存储不可用时退化为仅内存计时。
  }
}

function restoreCountdown(): boolean {
  try {
    const deadline = Number(window.sessionStorage.getItem(LOCK_DEADLINE_KEY))
    const storedTotal = Number(window.sessionStorage.getItem(LOCK_TOTAL_KEY))
    if (!Number.isFinite(deadline) || deadline <= Date.now()) return false

    const left = Math.ceil((deadline - Date.now()) / 1000)
    if (left <= 0) return false
    if (Number.isFinite(storedTotal) && storedTotal > 0) total.value = storedTotal
    remaining.value = Math.min(left, total.value)
    return true
  } catch {
    return false
  }
}

function clearDeadline(): void {
  try {
    window.sessionStorage.removeItem(LOCK_DEADLINE_KEY)
    window.sessionStorage.removeItem(LOCK_TOTAL_KEY)
  } catch {
    // 忽略存储异常。
  }
}

/** 锁屏期间禁用右键菜单与刷新快捷键，避免页面重载导致倒计时被重置。 */
function blockContextMenu(event: MouseEvent): void {
  event.preventDefault()
}

function blockRefreshShortcut(event: KeyboardEvent): void {
  const key = event.key.toLowerCase()
  const withModifier = event.ctrlKey || event.metaKey
  if (key === 'f5' || (withModifier && key === 'r')) {
    event.preventDefault()
    event.stopPropagation()
  }
}

async function playTone(): Promise<void> {
  if (!audio) return
  try {
    audio.currentTime = 0
    await audio.play()
  } catch {
    // 自动播放被系统策略拦截时静默处理，不影响倒计时。
  }
}

async function complete(): Promise<void> {
  if (finished.value) return
  finished.value = true
  stopTimers()
  clearDeadline()
  audio?.pause()

  try {
    await completeLock()
  } catch {
    await closeLockWindow().catch(() => undefined)
  }
}

async function earlyEnd(): Promise<void> {
  if (lockConfig.value.forceLock) return

  const confirmed = await confirm({
    title: '提前结束提醒',
    message: '活动时间还没到。\n提前结束会影响健康习惯的！\n确定要提前结束吗？',
    confirmText: '提前结束',
    cancelText: '继续活动',
    tone: 'warn',
  })
  if (!confirmed) return

  finished.value = true
  stopTimers()
  clearDeadline()
  audio?.pause()
  await closeLockWindow().catch(() => undefined)
}

async function snooze(): Promise<void> {
  if (lockConfig.value.forceLock) return

  finished.value = true
  stopTimers()
  clearDeadline()
  audio?.pause()

  try {
    await snoozeReminder(5)
  } catch {
    await closeLockWindow().catch(() => undefined)
  }
}

async function skip(): Promise<void> {
  if (lockConfig.value.forceLock) return

  const confirmed = await confirm({
    title: '跳过本次提醒',
    message: '跳过本次不会计入完成次数。\n确定要跳过吗？',
    confirmText: '跳过',
    cancelText: '再坚持一下',
    tone: 'warn',
  })
  if (!confirmed) return

  finished.value = true
  stopTimers()
  clearDeadline()
  audio?.pause()

  try {
    await skipReminder()
  } catch {
    await closeLockWindow().catch(() => undefined)
  }
}

onMounted(async () => {
  window.addEventListener('contextmenu', blockContextMenu)
  window.addEventListener('keydown', blockRefreshShortcut, true)

  if (isDesktopRuntime()) {
    try {
      lockConfig.value = await getLockConfig()
    } catch (cause) {
      console.warn('[lock] 读取锁屏配置失败', cause)
    }
    try {
      const config = await getConfig()
      soundEnabled.value = config.soundEnabled
    } catch (cause) {
      console.warn('[lock] 读取提醒设置失败', cause)
    }
  }

  total.value = Math.max(1, lockConfig.value.durationSecs)
  if (!restoreCountdown()) {
    remaining.value = total.value
    persistDeadline(total.value)
  }

  if (soundEnabled.value) {
    audio = new Audio(alertAudioUrl)
    audio.preload = 'auto'
    audio.volume = 0.7
    void playTone()
    toneTimer = window.setInterval(() => {
      void playTone()
    }, 3000)
  }

  tickTimer = window.setInterval(() => {
    remaining.value = Math.max(0, remaining.value - 1)
    if (remaining.value === 0) {
      void complete()
    }
  }, 1000)

  deadlineTimer = window.setTimeout(() => {
    void complete()
  }, remaining.value * 1000)
})

onBeforeUnmount(() => {
  window.removeEventListener('contextmenu', blockContextMenu)
  window.removeEventListener('keydown', blockRefreshShortcut, true)
  stopTimers()
  audio?.pause()
  audio = null
})
</script>

<template>
  <div class="lock-screen">
    <LockBackdrop />
    <div class="lock-glow lock-glow--one" />
    <div class="lock-glow lock-glow--two" />

    <section class="lock-card">
      <div class="lock-emoji" aria-hidden="true">🧘</div>
      <p class="lock-eyebrow">{{ lockConfig.forceLock ? '强制休息' : '锁屏提醒' }}</p>
      <h1 class="lock-title">该活动啦！</h1>
      <p class="lock-subtitle">站起来走走，伸个懒腰<br />活动一下筋骨。</p>

      <div class="ring">
        <svg class="ring__svg" viewBox="0 0 280 280" role="img" aria-label="剩余时间">
          <circle class="ring__track" cx="140" cy="140" r="120" />
          <circle
            class="ring__progress"
            cx="140"
            cy="140"
            r="120"
            :stroke-dasharray="circumference"
            :stroke-dashoffset="dashOffset"
          />
        </svg>
        <div class="ring__center">
          <span class="ring__time">{{ timeText }}</span>
          <span class="ring__label">倒计时</span>
        </div>
      </div>

      <button
        type="button"
        class="lock-primary"
        :class="{ 'lock-primary--disabled': lockConfig.forceLock }"
        :disabled="lockConfig.forceLock"
        @click="earlyEnd"
      >
        {{ primaryLabel }}
      </button>

      <div v-if="!lockConfig.forceLock" class="lock-secondary">
        <button type="button" @click="snooze">稍后 5 分钟</button>
        <button type="button" @click="skip">跳过本次</button>
      </div>

      <div class="lock-suggestions">
        <span><i aria-hidden="true">🚶</i>走动一下</span>
        <span><i aria-hidden="true">💧</i>喝杯热水</span>
        <span><i aria-hidden="true">👀</i>看看远方</span>
      </div>

      <p class="lock-hint">
        {{
          lockConfig.forceLock
            ? '强制锁屏中，键盘已锁定，请等待倒计时结束。'
            : '鼠标仍可操作；音量键保持可用。'
        }}
      </p>
    </section>

    <ConfirmDialog />
  </div>
</template>
