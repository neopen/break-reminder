import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { getVersion } from '@tauri-apps/api/app'

import { getRuntimeStatus, isDesktopRuntime } from '@/services/desktop'
import type { RuntimeStatus } from '@/types/desktop'

const desktop = isDesktopRuntime()

const status = ref<RuntimeStatus>({
  blocking: false,
  hookInstalled: false,
  platformSupported: false,
  platform: desktop ? 'unknown' : 'web',
})

const version = ref('1.0.0')

const platformLabel = computed(() => {
  const labels: Record<string, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    web: '浏览器',
  }
  return labels[status.value.platform] ?? status.value.platform
})

let subscribers = 0
let pollTimer: number | undefined
let versionLoaded = false

async function refreshStatus(): Promise<void> {
  if (!desktop) return

  try {
    status.value = await getRuntimeStatus()
  } catch (cause) {
    console.warn('[runtime] 读取运行状态失败', cause)
  }

  if (versionLoaded) return
  versionLoaded = true

  try {
    version.value = await getVersion()
  } catch (cause) {
    console.warn('[runtime] 读取应用版本失败', cause)
  }
}

/**
 * 全应用共享一份运行状态轮询，多个组件同时使用只启动一个定时器。
 */
export function useRuntimeStatus() {
  onMounted(() => {
    subscribers += 1
    if (subscribers === 1) {
      void refreshStatus()
      pollTimer = window.setInterval(() => {
        void refreshStatus()
      }, 1500)
    }
  })

  onBeforeUnmount(() => {
    subscribers = Math.max(0, subscribers - 1)
    if (subscribers === 0 && pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = undefined
    }
  })

  return { desktop, status, version, platformLabel, refreshStatus }
}
