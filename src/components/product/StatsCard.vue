<script setup lang="ts">
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/stores/app'
import { useConfirm } from '@/composables/useConfirm'

const store = useAppStore()
const { stats } = storeToRefs(store)
const { confirm } = useConfirm()

async function resetToday(): Promise<void> {
  const confirmed = await confirm({
    title: '重置今日统计',
    message: '确定要重置今日的活动记录吗？',
    confirmText: '重置',
    cancelText: '取消',
    tone: 'warn',
  })

  if (confirmed) {
    await store.resetToday()
  }
}
</script>

<template>
  <section class="stats-card">
    <header class="stats-card__header">
      <span>📊 今日打卡</span>
      <button type="button" class="stats-card__reset" title="重置今日统计" @click="resetToday">
        ↻
      </button>
    </header>

    <div class="stats-card__grid">
      <div class="stats-card__item">
        <strong>{{ stats.todayCount }}</strong>
        <span>今日活动</span>
      </div>
      <div class="stats-card__item">
        <strong>{{ stats.continuousDays }}</strong>
        <span>连续打卡</span>
      </div>
      <div class="stats-card__item">
        <strong>{{ stats.weeklyRate }}%</strong>
        <span>本周完成率</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stats-card {
  padding: var(--hc-space-4) var(--hc-space-5);
  color: #fff;
  background: var(--hc-gradient-accent);
  border-radius: var(--hc-radius-lg);
  box-shadow: var(--hc-shadow-soft);
}

.stats-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 600;
  opacity: 0.94;
}

.stats-card__reset {
  width: 28px;
  height: 28px;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  font-size: 16px;
  line-height: 1;
  transition: background var(--hc-duration-fast) var(--hc-ease);
}

.stats-card__reset:hover {
  background: rgba(255, 255, 255, 0.32);
}

.stats-card__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--hc-space-2);
  margin-top: var(--hc-space-3);
  text-align: center;
}

.stats-card__item strong {
  display: block;
  font-size: 28px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stats-card__item span {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.84;
}
</style>
