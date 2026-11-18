<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { emit } from '@tauri-apps/api/event'

import AppButton from '@/components/AppButton.vue'
import StatusPill from '@/components/StatusPill.vue'
import {
  closeLockWindow,
  getLockConfig,
  getRuntimeStatus,
  isDesktopRuntime,
  type LockConfig,
} from '@/services/desktop'

const config = ref<LockConfig>({ durationSecs: 60, forceLock: false })
const remaining = ref(60)
const total = ref(60)
const blocking = ref(false)
const supported = ref(true)
const audioState = ref<'pending' | 'playing' | 'blocked'>('pending')
const audioDetail = ref('等待播放…')
const playedCount = ref(0)
const isDev = import.meta.env.DEV

let tickTimer: number | undefined
let toneTimer: number | undefined
let audio: HTMLAudioElement | null = null
let finishing = false

const circumference = 2 * Math.PI * 120
const progress = computed(() => (total.value > 0 ? remaining.value / total.value : 0))
const dashOffset = computed(() => circumference * (1 - progress.value))
const timeText = computed(() => {
  const minutes = Math.floor(remaining.value / 60)
  const seconds = remaining.value % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const canClose = computed(() => !config.value.forceLock || remaining.value <= 0)

async function reportAudio(): Promise<void> {
  await emit('hc-audio-autoplay', {
    ok: audioState.value === 'playing',
    detail: audioDetail.value,
    playedCount: playedCount.value,
  }).catch(() => undefined)
}

async function playTone(): Promise<void> {
  if (!audio) return
  try {
    audio.currentTime = 0
    await audio.play()
    audioState.value = 'playing'
    playedCount.value += 1
    audioDetail.value = `已自动播放 ${playedCount.value} 次`
  } catch (cause) {
    audioState.value = 'blocked'
    audioDetail.value = cause instanceof Error ? cause.message : String(cause)
  }
  await reportAudio()
}

function stopTimers(): void {
  if (tickTimer) window.clearInterval(tickTimer)
  if (toneTimer) window.clearInterval(toneTimer)
  tickTimer = undefined
  toneTimer = undefined
}

async function finish(): Promise<void> {
  if (finishing) return
  finishing = true
  stopTimers()
  audio?.pause()
  try {
    await closeLockWindow()
  } catch {
    window.close()
  }
}

onMounted(async () => {
  if (isDesktopRuntime()) {
    try {
      config.value = await getLockConfig()
    } catch (cause) {
      console.warn('[lock] 读取锁屏配置失败', cause)
    }
    try {
      const status = await getRuntimeStatus()
      blocking.value = status.blocking
      supported.value = status.platformSupported
    } catch (cause) {
      console.warn('[lock] 读取拦截状态失败', cause)
    }
  }

  total.value = Math.max(1, config.value.durationSecs)
  remaining.value = total.value

  audio = new Audio('/audio/alert.wav')
  audio.preload = 'auto'
  audio.volume = 0.7

  await playTone()
  toneTimer = window.setInterval(() => {
    void playTone()
  }, 3000)

  tickTimer = window.setInterval(() => {
    remaining.value = Math.max(0, remaining.value - 1)
    if (remaining.value === 0) {
      void finish()
    }
  }, 1000)
})

onBeforeUnmount(() => {
  stopTimers()
  audio?.pause()
  audio = null
})
</script>

<template>
  <div class="lock-screen">
    <div class="lock-glow lock-glow--one" />
    <div class="lock-glow lock-glow--two" />

    <section class="lock-card">
      <p class="lock-eyebrow">
        {{ blocking ? '键盘已锁定 · 请起来活动' : '健康提醒' }}
      </p>
      <h1 class="lock-title">起来走一走</h1>
      <p class="lock-subtitle">站起来活动一下，喝口水，看看远处。</p>

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
          <span class="ring__label">剩余时间</span>
        </div>
      </div>

      <div class="lock-audio">
        <StatusPill
          :tone="audioState === 'playing' ? 'ok' : audioState === 'blocked' ? 'danger' : 'off'"
          :label="audioState === 'playing' ? '音频自动播放中' : audioState === 'blocked' ? '音频被拦截' : '音频准备中'"
        />
        <span class="lock-audio__detail">{{ audioDetail }}</span>
      </div>

      <div class="lock-actions">
        <AppButton v-if="canClose" variant="secondary" @click="finish">结束提醒</AppButton>
        <button v-else-if="isDev" type="button" class="lock-debug" @click="finish">
          调试：提前结束
        </button>
      </div>

      <p class="lock-hint">
        {{
          supported
            ? '全局键盘拦截已启用（音量键除外），鼠标仍可操作。'
            : '当前平台暂未实现全局键盘拦截，可直接点击按钮结束。'
        }}
      </p>
    </section>
  </div>
</template>
