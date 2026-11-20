<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/stores/app'
import { useConfirm } from '@/composables/useConfirm'

const store = useAppStore()
const { stats } = storeToRefs(store)
const { confirm } = useConfirm()

const dailyGoalPercent = computed(() => {
  if (!stats.value.dailyTarget) return 0
  return Math.min(100, Math.round((stats.value.todayCount / stats.value.dailyTarget) * 100))
})

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
      <span>今日打卡</span>
      <button type="button" class="stats-card__reset" title="重置今日统计" @click="resetToday">
        ↻
      </button>
    </header>

    <div class="stats-card__grid">
      <div class="stats-card__item">
        <strong>
          {{ stats.todayCount }}<small class="stats-card__target">/{{ stats.dailyTarget }}</small>
        </strong>
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

    <div class="stats-card__goal" :title="`今日目标 ${stats.todayCount}/${stats.dailyTarget}`">
      <span :style="{ width: `${dailyGoalPercent}%` }" />
    </div>
  </section>
</template>

<style scoped>
.stats-card {
  padding: 12px 18px;
  color: #fff;
  background: var(--hc-gradient-accent);
  border-radius: 20px;
  box-shadow: var(--hc-shadow-soft);
}

.stats-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.94;
}

.stats-card__reset {
  width: 24px;
  height: 24px;
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  font-size: 14px;
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
  margin-top: 8px;
  text-align: center;
}

.stats-card__item strong {
  display: block;
  font-size: 24px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}

.stats-card__item span {
  display: block;
  margin-top: 1px;
  font-size: 11px;
  opacity: 0.84;
}

.stats-card__target {
  margin-left: 1px;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.7;
}

.stats-card__goal {
  height: 3px;
  margin-top: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
}

.stats-card__goal span {
  display: block;
  height: 100%;
  background: #fff;
  border-radius: 999px;
  transition: width var(--hc-duration-normal) var(--hc-ease);
}
</style>
