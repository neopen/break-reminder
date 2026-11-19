<script setup lang="ts">
import { onMounted } from 'vue'

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
</script>

<template>
  <main class="app-shell">
    <StatusBar />

    <InlineAlert
      v-if="!store.desktop"
      tone="warn"
      message="当前在浏览器中运行，提醒与原生能力不可用。请使用 npm run tauri dev 启动桌面端。"
    />

    <StatsCard />
    <SettingsCard />
    <ActionsCard />
    <AboutBar />
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
</style>
