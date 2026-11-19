<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { listen, type UnlistenFn } from '@tauri-apps/api/event'

import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import InlineAlert from '@/components/InlineAlert.vue'
import StatusPill from '@/components/StatusPill.vue'
import { useRuntimeStatus } from '@/composables/useRuntimeStatus'
import { openLockWindow } from '@/services/desktop'
import type { AudioAutoplayPayload } from '@/types/desktop'
import { describeError } from '@/utils/error'

const { desktop, refreshStatus } = useRuntimeStatus()

const duration = ref(30)
const busy = ref(false)
const error = ref('')
const notice = ref('')
const audioResult = ref<AudioAutoplayPayload | null>(null)

let unlisten: UnlistenFn | undefined
let disposed = false

const audioLabel = computed(() => {
  if (!audioResult.value) return '尚未测试'
  return audioResult.value.ok ? '自动播放成功' : '被自动播放策略拦截'
})

const audioTone = computed<'ok' | 'warn' | 'off'>(() => {
  if (!audioResult.value) return 'off'
  return audioResult.value.ok ? 'ok' : 'warn'
})

onMounted(async () => {
  unlisten = await listen<AudioAutoplayPayload>('hc-audio-autoplay', (event) => {
    audioResult.value = event.payload
  })
  if (disposed) unlisten?.()
})

onBeforeUnmount(() => {
  disposed = true
  unlisten?.()
})

async function runLockTest(): Promise<void> {
  error.value = ''
  notice.value = ''
  audioResult.value = null
  busy.value = true

  try {
    await openLockWindow(duration.value, false)
    notice.value = `锁屏遮罩已打开（${duration.value} 秒）。请尝试按键验证拦截效果。`
    await refreshStatus()
  } catch (cause) {
    error.value = `打开锁屏失败：${describeError(cause)}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AppCard
    title="锁屏提醒冒烟测试"
    description="验证全屏置顶、遮罩窗口、音频自动播放三项核心能力。"
  >
    <div class="hc-field">
      <label for="lock-duration">提醒时长</label>
      <select id="lock-duration" v-model.number="duration" :disabled="!desktop || busy">
        <option :value="15">15 秒</option>
        <option :value="30">30 秒</option>
        <option :value="60">60 秒</option>
      </select>
    </div>

    <div class="hc-result-row">
      <span class="hc-result-label">音频自动播放</span>
      <StatusPill :tone="audioTone" :label="audioLabel" />
    </div>
    <p v-if="audioResult" class="hc-muted">
      {{ audioResult.detail }}（共播放 {{ audioResult.playedCount }} 次）
    </p>

    <InlineAlert v-if="error" tone="danger" :message="error" />
    <InlineAlert v-if="notice" tone="ok" :message="notice" />

    <template #footer>
      <AppButton :disabled="!desktop" :loading="busy" @click="runLockTest">
        打开锁屏遮罩
      </AppButton>
      <AppButton variant="ghost" :disabled="!desktop" @click="refreshStatus">刷新状态</AppButton>
    </template>
  </AppCard>
</template>
