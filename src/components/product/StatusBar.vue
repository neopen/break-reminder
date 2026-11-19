<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { getVersion } from '@tauri-apps/api/app'

import StatusPill from '@/components/StatusPill.vue'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { scheduler, statusLabel, modeLabel } = storeToRefs(store)
const version = ref('1.0.0')

onMounted(async () => {
  try {
    version.value = await getVersion()
  } catch (cause) {
    console.warn('[status] 读取版本失败', cause)
  }
})
</script>

<template>
  <header class="status-bar">
    <div>
      <p class="status-bar__eyebrow">Breakly · 健康提醒</p>
      <h1 class="status-bar__title">别坐了</h1>
      <p class="status-bar__subtitle">起来走走 · 拒绝久坐</p>
    </div>
    <div class="status-bar__meta">
      <StatusPill :tone="scheduler.running ? 'ok' : 'off'" :label="statusLabel" />
      <span class="status-bar__detail">{{ modeLabel }} · v{{ version }}</span>
    </div>
  </header>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--hc-space-4);
  padding: var(--hc-space-5) var(--hc-space-6);
  color: #fff;
  background: var(--hc-gradient-brand);
  border-radius: var(--hc-radius-xl);
  box-shadow: var(--hc-shadow-card);
}

.status-bar__eyebrow {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.8;
}

.status-bar__title {
  margin-top: var(--hc-space-2);
  font-size: 32px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.status-bar__subtitle {
  margin-top: var(--hc-space-1);
  font-size: 14px;
  opacity: 0.9;
}

.status-bar__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--hc-space-2);
  padding-top: var(--hc-space-1);
}

.status-bar__detail {
  font-size: 12px;
  opacity: 0.8;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .status-bar {
    flex-direction: column;
  }

  .status-bar__meta {
    align-items: flex-start;
  }
}
</style>
