<script setup lang="ts">
import { onMounted } from 'vue'

import { openUrl } from '@tauri-apps/plugin-opener'

import InlineAlert from '@/components/InlineAlert.vue'
import AboutBar from '@/components/product/AboutBar.vue'
import ActionsCard from '@/components/product/ActionsCard.vue'
import SettingsCard from '@/components/product/SettingsCard.vue'
import StatsCard from '@/components/product/StatsCard.vue'
import StatusBar from '@/components/product/StatusBar.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()

onMounted(() => {
  void store.init()
})

async function openAbout(): Promise<void> {
  const url = 'https://helpenx.com/'
  if (store.desktop) {
    try {
      await openUrl(url)
    } catch (cause) {
      console.warn('[about] 打开链接失败', cause)
    }
  } else {
    window.open(url, '_blank', 'noopener')
  }
}
</script>

<template>
  <main class="app-shell">
    <StatusBar />

    <InlineAlert
      v-if="!store.desktop"
      tone="warn"
      message="当前在浏览器中运行，提醒与原生能力不可用。请使用 npm run tauri dev 启动桌面端。"
    />

    <ActionsCard />
    <StatsCard />
    <SettingsCard />
    <AboutBar />
    <div class="about-link">
      <button type="button" @click="openAbout">关于我们</button>
    </div>
  </main>

  <ConfirmDialog />
  <ToastHost />
</template>

<style scoped>
.app-shell {
  width: min(560px, 100%);
  margin: 0 auto;
  padding: 16px 14px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.about-link {
  display: flex;
  justify-content: center;
  padding-top: 2px;
}

.about-link button {
  padding: 0;
  font-size: 12px;
  color: var(--hc-color-text-faint);
  background: none;
  border: none;
  transition: color var(--hc-duration-fast) var(--hc-ease);
}

.about-link button:hover {
  color: var(--hc-color-brand);
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
