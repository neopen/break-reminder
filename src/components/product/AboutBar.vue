<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getVersion } from '@tauri-apps/api/app'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

import FeedbackDialog from '@/components/ui/FeedbackDialog.vue'
import { useToast } from '@/composables/useToast'
import { describeError } from '@/utils/error'
import { openExternalLink } from '@/utils/openExternal'

const { show } = useToast()

const version = ref('1.0.1')
const checking = ref(false)
const installing = ref(false)
const available = ref<{ version: string } | null>(null)
const feedbackOpen = ref(false)

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

async function openLink(url: string): Promise<void> {
  try {
    await openExternalLink(url)
  } catch (cause) {
    show(`打开链接失败：${describeError(cause)}`, 'danger')
  }
}

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
      show('检查更新失败：网络异常，稍后再试', 'danger')
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

    <div class="about-bar__center">
      <button type="button" class="about-bar__link" @click="openLink('https://helpenx.com/')">
        关于我们
      </button>
      <span class="about-bar__sep" aria-hidden="true">·</span>
      <button type="button" class="about-bar__link" @click="openLink('https://helpoke.com/')">
        在线工具
      </button>
      <span class="about-bar__sep" aria-hidden="true">·</span>
      <button type="button" class="about-bar__link" @click="feedbackOpen = true">功能反馈</button>
    </div>

    <div class="about-bar__right">
      <button
        v-if="available"
        type="button"
        class="about-bar__link about-bar__link--strong"
        :disabled="installing"
        @click="installUpdate"
      >
        {{ installing ? '安装中…' : installLabel }}
      </button>
      <button type="button" class="about-bar__link" :disabled="checking" @click="checkForUpdates">
        {{ checking ? '检查中…' : '检查更新' }}
      </button>
    </div>
  </footer>

  <FeedbackDialog v-model:open="feedbackOpen" />
</template>

<style scoped>
.about-bar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  padding: 0 var(--hc-space-1);
  font-size: 12px;
  color: var(--hc-color-text-faint);
}

.about-bar__brand {
  justify-self: start;
  font-weight: 600;
  color: var(--hc-color-text-muted);
  white-space: nowrap;
}

.about-bar__center,
.about-bar__right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.about-bar__center {
  justify-self: center;
}

.about-bar__right {
  justify-self: end;
}

.about-bar__sep {
  opacity: 0.45;
}

.about-bar__link {
  padding: 0;
  font-size: 12px;
  color: var(--hc-color-text-muted);
  background: none;
  border: none;
  transition: color var(--hc-duration-fast) var(--hc-ease);
}

.about-bar__link:hover:not(:disabled) {
  color: var(--hc-color-brand);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.about-bar__link:disabled {
  opacity: 0.55;
  cursor: default;
}

.about-bar__link--strong {
  font-weight: 600;
  color: var(--hc-color-brand-deep);
}

@media (max-width: 520px) {
  .about-bar {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 4px;
  }

  .about-bar__brand,
  .about-bar__center,
  .about-bar__right {
    justify-self: center;
  }
}
</style>
