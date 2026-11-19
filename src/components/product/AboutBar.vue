<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

import AppButton from '@/components/AppButton.vue'
import { useToast } from '@/composables/useToast'
import { describeError } from '@/utils/error'

const { show } = useToast()

const version = ref('1.0.0')
const checking = ref(false)
const installing = ref(false)
const available = ref<{ version: string } | null>(null)

let pendingUpdate: Update | null = null

const installLabel = computed(() =>
  available.value ? `安装 v${available.value.version}` : '安装更新',
)

onMounted(async () => {
  try {
    version.value = await getVersion()
  } catch (cause) {
    console.warn('[about] 读取版本失败', cause)
  }
})

async function checkForUpdates(): Promise<void> {
  checking.value = true
  try {
    pendingUpdate = await check()
    if (pendingUpdate) {
      available.value = { version: pendingUpdate.version }
      show(`发现新版本 v${pendingUpdate.version}`, 'info')
    } else {
      available.value = null
      show('当前已是最新版本', 'ok')
    }
  } catch (cause) {
    const detail = describeError(cause)
    if (/valid release JSON|not found|404/i.test(detail)) {
      available.value = null
      show('当前没有可用的发布版本', 'info')
    } else {
      show(`检查更新失败：${detail}`, 'danger')
    }
  } finally {
    checking.value = false
  }
}

async function installUpdate(): Promise<void> {
  if (!pendingUpdate) return

  installing.value = true
  try {
    await pendingUpdate.downloadAndInstall()
    await relaunch()
  } catch (cause) {
    show(`安装更新失败：${describeError(cause)}`, 'danger')
  } finally {
    installing.value = false
  }
}
</script>

<template>
  <footer class="about-bar">
    <span class="about-bar__brand">Breakly v{{ version }}</span>
    <div class="about-bar__actions">
      <AppButton variant="ghost" :loading="checking" @click="checkForUpdates"> 检查更新 </AppButton>
      <AppButton v-if="available" :loading="installing" @click="installUpdate">
        {{ installLabel }}
      </AppButton>
    </div>
  </footer>
</template>

<style scoped>
.about-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
  padding: 0 var(--hc-space-1);
  font-size: 12px;
  color: var(--hc-color-text-muted);
}

.about-bar__brand {
  font-weight: 600;
}

.about-bar__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.about-bar__actions :deep(.app-button) {
  min-height: 30px;
  padding: 0 10px;
  font-size: 12px;
}
</style>
