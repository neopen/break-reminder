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
  gap: var(--hc-space-3);
  padding: 16px 20px;
  color: #fff;
  background: var(--hc-gradient-brand);
  border-radius: 24px;
  box-shadow: var(--hc-shadow-soft);
}

.status-bar__eyebrow {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0.78;
}

.status-bar__title {
  margin-top: 4px;
  font-size: 25px;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.status-bar__subtitle {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.88;
}

.status-bar__meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  padding-top: 2px;
}

.status-bar__detail {
  font-size: 11px;
  opacity: 0.78;
  white-space: nowrap;
}

@media (max-width: 520px) {
  .status-bar {
    flex-direction: column;
  }

  .status-bar__meta {
    align-items: flex-start;
  }
}
</style>
