<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import InlineAlert from '@/components/InlineAlert.vue'
import StatusPill from '@/components/StatusPill.vue'
import { useToast } from '@/composables/useToast'
import { openLockWindow } from '@/services/desktop'
import { useAppStore } from '@/stores/app'
import { describeError } from '@/utils/error'

const store = useAppStore()
const { runtime } = storeToRefs(store)
const { show } = useToast()

const version = ref('1.0.0')
const updateState = ref<'idle' | 'checking' | 'available' | 'latest' | 'installing'>('idle')
const updateMessage = ref('')
const error = ref('')

let pendingUpdate: Update | null = null

const isInstalling = computed(() => updateState.value === 'installing')

onMounted(async () => {
  try {
    version.value = await getVersion()
  } catch (cause) {
    console.warn('[diagnostics] 读取版本失败', cause)
  }
})

async function checkForUpdates(): Promise<void> {
  error.value = ''
  updateMessage.value = ''
  updateState.value = 'checking'

  try {
    pendingUpdate = await check()
    if (pendingUpdate) {
      updateState.value = 'available'
      updateMessage.value = `发现新版本 v${pendingUpdate.version}`
    } else {
      updateState.value = 'latest'
      updateMessage.value = '当前已是最新版本'
    }
  } catch (cause) {
    const detail = describeError(cause)
    if (/valid release JSON|not found|404/i.test(detail)) {
      updateState.value = 'latest'
      updateMessage.value = '当前没有可用的发布版本'
    } else {
      updateState.value = 'idle'
      error.value = `检查更新失败：${detail}`
    }
  }
}

async function installUpdate(): Promise<void> {
  if (!pendingUpdate) return

  error.value = ''
  updateState.value = 'installing'
  updateMessage.value = '正在下载并安装更新…'

  try {
    await pendingUpdate.downloadAndInstall()
    await relaunch()
  } catch (cause) {
    updateState.value = 'available'
    updateMessage.value = ''
    error.value = `安装更新失败：${describeError(cause)}`
  }
}

async function manualLockTest(): Promise<void> {
  try {
    await openLockWindow(60, false)
    show('已打开 60 秒锁屏测试，不会计入统计', 'info')
  } catch (cause) {
    show(`打开锁屏失败：${describeError(cause)}`, 'danger')
  }
}

function keyboardLabel(): string {
  if (!runtime.value.platformSupported) return '当前平台暂未实现'
  return runtime.value.blocking ? '已拦截' : '未拦截'
}

function keyboardTone(): 'ok' | 'warn' | 'off' {
  if (!runtime.value.platformSupported) return 'off'
  return runtime.value.blocking ? 'ok' : 'warn'
}
</script>

<template>
  <AppCard title="诊断与更新" description="排障与版本更新，不影响日常提醒。">
    <div class="hc-result-row">
      <span class="hc-result-label">应用版本</span>
      <StatusPill tone="ok" :label="`v${version}`" />
    </div>
    <div class="hc-result-row">
      <span class="hc-result-label">全局键盘拦截</span>
      <StatusPill :tone="keyboardTone()" :label="keyboardLabel()" />
    </div>

    <p v-if="updateMessage" class="hc-muted">{{ updateMessage }}</p>
    <InlineAlert v-if="error" tone="danger" :message="error" />

    <div class="diagnostic-actions">
      <AppButton
        variant="secondary"
        :loading="updateState === 'checking'"
        :disabled="updateState === 'installing'"
        @click="checkForUpdates"
      >
        检查更新
      </AppButton>
      <AppButton
        v-if="updateState === 'available' || isInstalling"
        :loading="isInstalling"
        @click="installUpdate"
      >
        安装更新
      </AppButton>
      <AppButton variant="secondary" @click="store.testNotification()"> 测试通知 </AppButton>
      <AppButton variant="secondary" @click="manualLockTest">锁屏测试</AppButton>
      <AppButton
        variant="secondary"
        :disabled="!runtime.platformSupported"
        @click="store.toggleKeyboard()"
      >
        {{ runtime.blocking ? '停止键盘拦截' : '测试键盘拦截' }}
      </AppButton>
    </div>

    <p class="hc-muted">
      键盘拦截测试会立即启用全局钩子，结束后请再次点击停止；锁屏测试不会记录统计。
    </p>
  </AppCard>
</template>

<style scoped>
.diagnostic-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hc-space-2);
}
</style>
