<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppButton from '@/components/AppButton.vue'
import GlassDialog from '@/components/ui/GlassDialog.vue'
import { useAppStore } from '@/stores/app'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()

const store = useAppStore()
const { stats, history } = storeToRefs(store)

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']
const MONTHS_BACK = 23

const viewYear = ref(new Date().getFullYear())
const viewMonth = ref(new Date().getMonth())

function monthIndex(year: number, month: number): number {
  return year * 12 + month
}

const bounds = computed(() => {
  const now = new Date()
  const current = monthIndex(now.getFullYear(), now.getMonth())
  return { current, earliest: current - MONTHS_BACK }
})

const canPrev = computed(() => monthIndex(viewYear.value, viewMonth.value) > bounds.value.earliest)
const canNext = computed(() => monthIndex(viewYear.value, viewMonth.value) < bounds.value.current)

const monthLabel = computed(() => `${viewYear.value} 年 ${viewMonth.value + 1} 月`)
const isCurrentMonth = computed(
  () => monthIndex(viewYear.value, viewMonth.value) === bounds.value.current,
)

function dateKey(year: number, month: number, day: number): string {
  return [year, String(month + 1).padStart(2, '0'), String(day).padStart(2, '0')].join('-')
}

const checkedDays = computed(() => history.value.filter((record) => record.count > 0).length)

const cells = computed(() => {
  const counts = new Map(history.value.map((record) => [record.date, record.count]))
  const now = new Date()
  const todayKey = dateKey(now.getFullYear(), now.getMonth(), now.getDate())
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const leading = (first.getDay() + 6) % 7
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const target = Math.max(1, stats.value.dailyTarget)

  const result: Array<{
    key: string
    day: number
    count: number
    level: number
    isToday: boolean
  } | null> = Array.from({ length: leading }, () => null)

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = dateKey(viewYear.value, viewMonth.value, day)
    const count = counts.get(key) ?? 0
    const level = count <= 0 ? 0 : count >= target ? 4 : count >= 6 ? 3 : count >= 3 ? 2 : 1

    result.push({ key, day, count, level, isToday: key === todayKey })
  }

  return result
})

watch(
  () => props.open,
  (open) => {
    if (!open) return

    const now = new Date()
    viewYear.value = now.getFullYear()
    viewMonth.value = now.getMonth()
    void store.loadHistory()
  },
)

function moveMonth(delta: number): void {
  if (delta < 0 && !canPrev.value) return
  if (delta > 0 && !canNext.value) return

  const next = new Date(viewYear.value, viewMonth.value + delta, 1)
  viewYear.value = next.getFullYear()
  viewMonth.value = next.getMonth()
}

function backToCurrent(): void {
  const now = new Date()
  viewYear.value = now.getFullYear()
  viewMonth.value = now.getMonth()
}

function close(): void {
  emit('update:open', false)
}
</script>

<template>
  <GlassDialog
    :open="open"
    title="连续打卡"
    subtitle="近两年每天的活动记录"
    icon="🗓"
    wide
    @update:open="emit('update:open', $event)"
  >
    <div class="calendar">
      <div class="summary">
        <div class="summary__item">
          <strong>{{ checkedDays }}</strong>
          <span>近两年打卡天数</span>
        </div>
        <div class="summary__item">
          <strong>{{ stats.continuousDays }}</strong>
          <span>当前连续天数</span>
        </div>
      </div>

      <div class="cal-head">
        <button
          type="button"
          class="cal-head__nav"
          aria-label="上个月"
          :disabled="!canPrev"
          @click="moveMonth(-1)"
        >
          ‹
        </button>

        <div class="cal-head__title">
          <span>{{ monthLabel }}</span>
          <button
            v-if="!isCurrentMonth"
            type="button"
            class="cal-head__today"
            @click="backToCurrent"
          >
            回到本月
          </button>
        </div>

        <button
          type="button"
          class="cal-head__nav"
          aria-label="下个月"
          :disabled="!canNext"
          @click="moveMonth(1)"
        >
          ›
        </button>
      </div>

      <div class="weekdays" aria-hidden="true">
        <span v-for="weekday in WEEKDAYS" :key="weekday">{{ weekday }}</span>
      </div>

      <div class="grid">
        <template v-for="(cell, index) in cells" :key="cell?.key ?? `empty-${index}`">
          <span v-if="!cell" class="cell cell--empty" />
          <span
            v-else
            class="cell"
            :class="[
              `cell--l${cell.level}`,
              { 'cell--today': cell.isToday, 'cell--checked': cell.count > 0 },
            ]"
            :title="cell.count > 0 ? `${cell.key} · ${cell.count} 次活动` : `${cell.key} · 无记录`"
          >
            {{ cell.day }}
          </span>
        </template>
      </div>

      <div class="legend">
        <span>少</span>
        <i class="legend__swatch cell--l1" />
        <i class="legend__swatch cell--l2" />
        <i class="legend__swatch cell--l3" />
        <i class="legend__swatch cell--l4" />
        <span>多</span>
      </div>
    </div>

    <template #footer>
      <AppButton variant="secondary" block @click="close">完成</AppButton>
    </template>
  </GlassDialog>
</template>

<style scoped>
.calendar {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-3);
}

.summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--hc-space-2);
  padding: var(--hc-space-3);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--hc-radius-md);
}

.summary__item {
  text-align: center;
}

.summary__item strong {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #f4f6ff;
  font-variant-numeric: tabular-nums;
}

.summary__item span {
  display: block;
  margin-top: 1px;
  font-size: 10px;
  color: #8d94bd;
}

.cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
}

.cal-head__nav {
  width: 32px;
  height: 32px;
  font-size: 20px;
  line-height: 1;
  color: #c7cdf0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  transition:
    background var(--hc-duration-fast) var(--hc-ease),
    opacity var(--hc-duration-fast) var(--hc-ease);
}

.cal-head__nav:hover:not(:disabled) {
  background: rgba(124, 92, 255, 0.28);
}

.cal-head__nav:disabled {
  opacity: 0.3;
  cursor: default;
}

.cal-head__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #eef2ff;
  font-variant-numeric: tabular-nums;
}

.cal-head__today {
  padding: 3px 8px;
  font-size: 10px;
  color: #c4b5fd;
  background: rgba(124, 92, 255, 0.16);
  border: 1px solid rgba(167, 139, 250, 0.35);
  border-radius: var(--hc-radius-pill);
}

.weekdays,
.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.weekdays span {
  padding-bottom: 2px;
  font-size: 10px;
  color: #8d94bd;
  text-align: center;
}

.cell {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-size: 12px;
  color: #6f769b;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
  border-radius: 9px;
  font-variant-numeric: tabular-nums;
}

.cell--empty {
  background: transparent;
}

.cell--checked {
  color: #eef2ff;
}

.cell--l1 {
  background: rgba(124, 92, 255, 0.2);
}

.cell--l2 {
  background: rgba(124, 92, 255, 0.38);
}

.cell--l3 {
  background: rgba(124, 92, 255, 0.58);
}

.cell--l4 {
  background: linear-gradient(135deg, #8b7cff, #38bdf8);
  box-shadow: 0 0 10px rgba(139, 124, 255, 0.4);
}

.cell--today {
  border-color: #38bdf8;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.4);
}

.legend {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 5px;
  font-size: 10px;
  color: #8d94bd;
}

.legend__swatch {
  width: 12px;
  height: 12px;
  border-radius: 4px;
}

.legend__swatch.cell--l1 {
  background: rgba(124, 92, 255, 0.2);
}

.legend__swatch.cell--l2 {
  background: rgba(124, 92, 255, 0.38);
}

.legend__swatch.cell--l3 {
  background: rgba(124, 92, 255, 0.58);
}

.legend__swatch.cell--l4 {
  background: linear-gradient(135deg, #8b7cff, #38bdf8);
}

@media (max-width: 420px) {
  .cell {
    font-size: 11px;
    border-radius: 7px;
  }
}
</style>
