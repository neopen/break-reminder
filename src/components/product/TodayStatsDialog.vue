<script setup lang="ts">
import { computed, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppButton from '@/components/AppButton.vue'
import GlassDialog from '@/components/ui/GlassDialog.vue'
import { useAppStore } from '@/stores/app'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()

const store = useAppStore()
const { stats, history } = storeToRefs(store)

const RING_RADIUS = 88
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS
const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

const dailyTarget = computed(() => Math.max(1, stats.value.dailyTarget))
const todayCount = computed(() => stats.value.todayCount)
const percent = computed(() =>
  Math.min(100, Math.round((todayCount.value / dailyTarget.value) * 100)),
)

const ringOffset = computed(
  () => RING_CIRCUMFERENCE * (1 - Math.min(1, todayCount.value / Math.max(1, dailyTarget.value))),
)

/** 目标次数对应的环形刻度点 */
const targetDots = computed(() => {
  const total = Math.max(1, stats.value.dailyTarget)
  return Array.from({ length: total }, (_, index) => {
    const angle = (Math.PI * 2 * index) / total - Math.PI / 2
    return {
      x: 110 + Math.cos(angle) * 101,
      y: 110 + Math.sin(angle) * 101,
      filled: index < todayCount.value,
    }
  })
})

function dateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

/** 近 7 天完成次数，用于小柱状图 */
const lastSevenDays = computed(() => {
  const counts = new Map(history.value.map((record) => [record.date, record.count]))
  const today = new Date()

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (6 - index))
    const key = dateKey(date)
    const count = index === 6 ? todayCount.value : (counts.get(key) ?? 0)

    return {
      key,
      weekday: WEEKDAYS[date.getDay()],
      count,
      height: Math.min(100, (count / dailyTarget.value) * 100),
      isToday: index === 6,
    }
  })
})

watch(
  () => props.open,
  (open) => {
    if (open) void store.loadHistory()
  },
)

function close(): void {
  emit('update:open', false)
}
</script>

<template>
  <GlassDialog
    :open="open"
    title="今日活动"
    subtitle="每一次起身活动，都值得被记录"
    icon="📊"
    @update:open="emit('update:open', $event)"
  >
    <div class="today">
      <div class="gauge">
        <svg class="gauge__svg" viewBox="0 0 220 220" role="img" aria-label="今日活动完成度">
          <defs>
            <linearGradient id="today-ring-gradient" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#a78bfa" />
              <stop offset="100%" stop-color="#38bdf8" />
            </linearGradient>
          </defs>

          <circle class="gauge__track" cx="110" cy="110" :r="RING_RADIUS" />
          <circle
            class="gauge__progress"
            cx="110"
            cy="110"
            :r="RING_RADIUS"
            :stroke-dasharray="RING_CIRCUMFERENCE"
            :stroke-dashoffset="ringOffset"
          />
          <circle
            v-for="(dot, index) in targetDots"
            :key="index"
            class="gauge__dot"
            :class="{ 'gauge__dot--filled': dot.filled }"
            :cx="dot.x"
            :cy="dot.y"
            r="2.4"
          />
        </svg>

        <div class="gauge__center">
          <strong>{{ todayCount }}</strong>
          <span>目标 {{ dailyTarget }} 次</span>
          <em>{{ percent }}%</em>
        </div>
      </div>

      <div class="metrics">
        <div class="metric">
          <strong
            >{{ todayCount }}<small>/{{ dailyTarget }}</small></strong
          >
          <span>今日完成</span>
        </div>
        <div class="metric">
          <strong>{{ stats.weeklyRate }}%</strong>
          <span>本周完成率</span>
        </div>
        <div class="metric">
          <strong>{{ stats.continuousDays }}<small>天</small></strong>
          <span>连续打卡</span>
        </div>
      </div>

      <section class="trend">
        <header class="trend__head">
          <span>近 7 天</span>
          <span class="trend__goal">目标 {{ dailyTarget }} 次/天</span>
        </header>

        <div class="bars">
          <div
            v-for="day in lastSevenDays"
            :key="day.key"
            class="bar"
            :class="{ 'bar--today': day.isToday }"
            :title="`${day.key} · ${day.count} 次活动`"
          >
            <span class="bar__value">{{ day.count > 0 ? day.count : '' }}</span>
            <div class="bar__track">
              <span
                class="bar__fill"
                :class="{ 'bar__fill--empty': day.count === 0 }"
                :style="{ height: `${day.height}%` }"
              />
            </div>
            <span class="bar__label">{{ day.isToday ? '今天' : day.weekday }}</span>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <AppButton variant="secondary" block @click="close">完成</AppButton>
    </template>
  </GlassDialog>
</template>

<style scoped>
.today {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-4);
}

.gauge {
  position: relative;
  width: 220px;
  height: 220px;
  margin: 0 auto;
}

.gauge__svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.gauge__track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.08);
  stroke-width: 8;
}

.gauge__progress {
  fill: none;
  stroke: url(#today-ring-gradient);
  stroke-width: 8;
  stroke-linecap: round;
  filter: drop-shadow(0 0 8px rgba(139, 124, 255, 0.55));
  transition: stroke-dashoffset var(--hc-duration-normal) var(--hc-ease);
}

.gauge__dot {
  fill: rgba(255, 255, 255, 0.16);
  transform-box: fill-box;
  transform-origin: center;
}

.gauge__dot--filled {
  fill: #c4b5fd;
  filter: drop-shadow(0 0 3px rgba(167, 139, 250, 0.8));
}

.gauge__center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
}

.gauge__center strong {
  font-size: 54px;
  font-weight: 650;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  background: linear-gradient(180deg, #ffffff, #c3c9ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.gauge__center span {
  font-size: 11px;
  color: #8d94bd;
}

.gauge__center em {
  margin-top: 3px;
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  color: #a5b4fc;
}

.metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--hc-space-2);
  padding: var(--hc-space-3) 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.metric {
  text-align: center;
}

.metric strong {
  display: block;
  font-size: 20px;
  font-weight: 700;
  color: #f4f6ff;
  font-variant-numeric: tabular-nums;
}

.metric small {
  font-size: 11px;
  font-weight: 500;
  color: #8d94bd;
}

.metric span {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #8d94bd;
}

.trend__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  color: #c7cdf0;
}

.trend__goal {
  font-size: 10px;
  color: #8d94bd;
}

.bars {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 8px;
  margin-top: var(--hc-space-3);
}

.bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.bar__value {
  height: 12px;
  font-size: 10px;
  font-weight: 600;
  color: #a5b4fc;
  font-variant-numeric: tabular-nums;
}

.bar__track {
  position: relative;
  display: flex;
  align-items: flex-end;
  width: 100%;
  height: 84px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 7px;
}

.bar__fill {
  display: block;
  width: 100%;
  min-height: 2px;
  background: linear-gradient(180deg, #a78bfa, #6366f1);
  border-radius: 6px 6px 4px 4px;
  transition: height var(--hc-duration-normal) var(--hc-ease);
}

.bar__fill--empty {
  min-height: 0;
  background: transparent;
}

.bar--today .bar__fill {
  background: linear-gradient(180deg, #c4b5fd, #38bdf8);
  box-shadow: 0 0 12px rgba(139, 124, 255, 0.55);
}

.bar--today .bar__label {
  font-weight: 700;
  color: #eef2ff;
}

.bar__label {
  font-size: 10px;
  color: #8d94bd;
}

@media (max-width: 420px) {
  .gauge {
    width: 190px;
    height: 190px;
  }
}
</style>
