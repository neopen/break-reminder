<script setup lang="ts">
import { onMounted, ref } from 'vue'

import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import InlineAlert from '@/components/InlineAlert.vue'
import StatusPill from '@/components/StatusPill.vue'
import { isDesktopRuntime } from '@/services/desktop'
import { describeError } from '@/utils/error'

const desktop = isDesktopRuntime()
const version = ref('1.0.0')
const state = ref<'idle' | 'checking' | 'available' | 'latest' | 'installing'>('idle')
const message = ref('')
const available = ref<{ version: string } | null>(null)
const error = ref('')

let pendingUpdate: Update | null = null

onMounted(async () => {
  if (!desktop) return
  try {
    version.value = await getVersion()
  } catch (cause) {
    console.warn('[update] 读取应用版本失败', cause)
  }
})

async function checkForUpdates(): Promise<void> {
  error.value = ''
  message.value = ''
  state.value = 'checking'

  try {
    pendingUpdate = await check()
    if (pendingUpdate) {
      available.value = { version: pendingUpdate.version }
      state.value = 'available'
      message.value = `发现新版本 v${pendingUpdate.version}`
    } else {
      available.value = null
      state.value = 'latest'
      message.value = '当前已是最新版本'
    }
  } catch (cause) {
    const detail = describeError(cause)
    if (/valid release JSON|not found|404/i.test(detail)) {
      available.value = null
      state.value = 'latest'
      message.value = '当前没有可用的发布版本（测试包预期行为）'
    } else {
      state.value = 'idle'
      error.value = `检查更新失败：${detail}`
    }
  }
}

async function installUpdate(): Promise<void> {
  if (!pendingUpdate) return

  error.value = ''
  state.value = 'installing'
  message.value = '正在下载并安装更新…'

  try {
    await pendingUpdate.downloadAndInstall()
    await relaunch()
  } catch (cause) {
    state.value = 'available'
    message.value = ''
    error.value = `安装更新失败：${describeError(cause)}`
  }
}
</script>

<template>
  <AppCard title="自动更新" description="GitHub Release + tauri-plugin-updater，更新包带签名校验。">
    <div class="hc-result-row">
      <span class="hc-result-label">当前版本</span>
      <StatusPill tone="ok" :label="`v${version}`" />
    </div>
    <p v-if="message" class="hc-muted">{{ message }}</p>

    <InlineAlert v-if="error" tone="danger" :message="error" />

    <template #footer>
      <AppButton
        variant="secondary"
        :disabled="!desktop || state === 'checking' || state === 'installing'"
        :loading="state === 'checking'"
        @click="checkForUpdates"
      >
        检查更新
      </AppButton>
      <AppButton v-if="available" :loading="state === 'installing'" @click="installUpdate">
        安装 v{{ available.version }}
      </AppButton>
    </template>
  </AppCard>
</template>
