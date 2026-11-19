<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/stores/app'

const store = useAppStore()
const { scheduler, countdownLabel, nextTimeLabel, loading } = storeToRefs(store)
</script>

<template>
  <section class="actions-card">
    <div v-if="scheduler.running" class="actions-card__next">
      <div>
        <span class="actions-card__next-label">⏰ 下次提醒</span>
        <strong class="actions-card__next-time">{{ nextTimeLabel }}</strong>
      </div>
      <div class="actions-card__countdown">{{ countdownLabel }}</div>
    </div>

    <div class="actions-card__main">
      <button
        v-if="!scheduler.running"
        type="button"
        class="actions-card__action actions-card__action--primary"
        :disabled="loading"
        @click="store.start()"
      >
        ▶ 启动提醒
      </button>
      <button
        v-else
        type="button"
        class="actions-card__action actions-card__action--danger"
        :disabled="loading"
        @click="store.stop()"
      >
        ⏹️ 停止提醒
      </button>
    </div>

    <div v-if="scheduler.running" class="actions-card__secondary">
      <button type="button" @click="store.snooze(5)">稍后 5 分钟</button>
      <button type="button" @click="store.snooze(10)">稍后 10 分钟</button>
      <button type="button" @click="store.snooze(30)">稍后 30 分钟</button>
      <button type="button" @click="store.skip()">跳过本次</button>
    </div>
  </section>
</template>

<style scoped>
.actions-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  background: var(--hc-color-surface);
  border: 1px solid var(--hc-color-border);
  border-radius: 20px;
  box-shadow: var(--hc-shadow-soft);
}

.actions-card__next {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
  padding: 10px 12px;
  color: #5b21b6;
  background: #ede9fe;
  border: 1px solid #ddd6fe;
  border-radius: 12px;
}

.actions-card__next-label {
  font-size: 11px;
}

.actions-card__next-time {
  display: block;
  margin-top: 1px;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.actions-card__countdown {
  font-size: 20px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.actions-card__main {
  display: flex;
}

.actions-card__action {
  flex: 1;
  min-height: 46px;
  color: #fff;
  border: none;
  border-radius: var(--hc-radius-pill);
  font-size: 15px;
  font-weight: 700;
  transition:
    transform var(--hc-duration-fast) var(--hc-ease),
    opacity var(--hc-duration-fast) var(--hc-ease);
}

.actions-card__action:active {
  transform: scale(0.98);
}

.actions-card__action:disabled {
  opacity: 0.6;
}

.actions-card__action--primary {
  background: var(--hc-gradient-brand);
  box-shadow: 0 10px 24px -12px rgba(102, 126, 234, 0.9);
}

.actions-card__action--danger {
  background: var(--hc-color-danger);
}

.actions-card__secondary {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.actions-card__secondary button {
  flex: 1;
  min-width: 92px;
  min-height: 32px;
  color: var(--hc-color-text-muted);
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-sm);
  font-size: 12px;
}
</style>
