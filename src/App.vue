<script setup lang="ts">
import { onMounted } from 'vue'

import InlineAlert from '@/components/InlineAlert.vue'
import ActionsCard from '@/components/product/ActionsCard.vue'
import DiagnosticsCard from '@/components/product/DiagnosticsCard.vue'
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

    <details class="advanced">
      <summary>高级与诊断</summary>
      <DiagnosticsCard />
    </details>

    <footer class="footer">
      <p>官网：breakly.helpoke.com</p>
      <p class="hc-muted">Ctrl+Alt+Del、Win+L 属于系统安全序列，桌面应用无法拦截。</p>
    </footer>
  </main>

  <ConfirmDialog />
  <ToastHost />
</template>

<style scoped>
.app-shell {
  width: min(680px, 100%);
  margin: 0 auto;
  padding: var(--hc-space-6) var(--hc-space-5) var(--hc-space-7);
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-4);
}

.advanced {
  padding: var(--hc-space-4) var(--hc-space-5);
  background: var(--hc-color-surface);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-lg);
  box-shadow: var(--hc-shadow-soft);
}

.advanced summary {
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-color-text-muted);
  cursor: pointer;
}

.advanced[open] summary {
  margin-bottom: var(--hc-space-3);
}

.footer {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-1);
  padding-top: var(--hc-space-2);
  font-size: 12px;
  color: var(--hc-color-text-muted);
  text-align: center;
}
</style>
