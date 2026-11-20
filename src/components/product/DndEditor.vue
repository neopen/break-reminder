<script setup lang="ts">
import { ref, watch } from 'vue'

import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { useToast } from '@/composables/useToast'
import type { CustomBreak, DoNotDisturb, TimeRange } from '@/types/desktop'

const props = defineProps<{
  modelValue: DoNotDisturb
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DoNotDisturb]
}>()

const { show } = useToast()

const lunchStart = ref(props.modelValue.lunchBreak.start)
const lunchEnd = ref(props.modelValue.lunchBreak.end)
const lunchError = ref('')

watch(
  () => props.modelValue.lunchBreak,
  (range) => {
    lunchStart.value = range.start
    lunchEnd.value = range.end
    lunchError.value = ''
  },
  { deep: true },
)

function toMinutes(value: string): number | null {
  const [hours, minutes] = value.split(':').map(Number)
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null
  return hours * 60 + minutes
}

function validateLunch(range: TimeRange): string {
  const start = toMinutes(range.start)
  const end = toMinutes(range.end)
  if (start === null || end === null) return '请填写完整的午休时间'
  if (end <= start) return '结束时间必须晚于开始时间'
  const duration = end - start
  if (duration < 10 || duration > 300) return '午休时长需在 10 分钟到 5 小时之间'
  return ''
}

function emitPatch(patch: Partial<DoNotDisturb>): void {
  emit('update:modelValue', {
    ...props.modelValue,
    ...patch,
    lunchBreak: patch.lunchBreak ? { ...patch.lunchBreak } : { ...props.modelValue.lunchBreak },
    customBreaks: (patch.customBreaks ?? props.modelValue.customBreaks).map((item) => ({
      ...item,
    })),
  })
}

function onEnabled(value: boolean): void {
  emitPatch({ enabled: value })
}

function onLunchChange(field: 'start' | 'end', event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (!value) return

  if (field === 'start') lunchStart.value = value
  else lunchEnd.value = value

  const range = { start: lunchStart.value, end: lunchEnd.value }
  const error = validateLunch(range)
  if (error) {
    lunchError.value = error
    return
  }

  lunchError.value = ''
  emitPatch({ lunchBreak: range })
}

function onBreakChange(index: number, field: keyof CustomBreak, event: Event): void {
  const value = (event.target as HTMLInputElement).value
  const next = props.modelValue.customBreaks.map((item, itemIndex) =>
    itemIndex === index ? { ...item, [field]: value } : { ...item },
  )
  emitPatch({ customBreaks: next })
}

function addBreak(): void {
  if (props.modelValue.customBreaks.length >= 5) {
    show('最多只能添加 5 个自定义时段', 'warn')
    return
  }

  emitPatch({
    customBreaks: [
      ...props.modelValue.customBreaks,
      { name: '新时段', start: '14:00', end: '15:00' },
    ],
  })
}

function removeBreak(index: number): void {
  emitPatch({
    customBreaks: props.modelValue.customBreaks.filter((_, itemIndex) => itemIndex !== index),
  })
}
</script>

<template>
  <div class="dnd">
    <ToggleSwitch
      :model-value="modelValue.enabled"
      label="启用免打扰"
      @update:model-value="onEnabled"
    />

    <template v-if="modelValue.enabled">
      <div class="dnd__row">
        <span class="dnd__label">午休时间段</span>
        <div class="dnd__times">
          <input type="time" :value="lunchStart" @change="onLunchChange('start', $event)" />
          <span>—</span>
          <input type="time" :value="lunchEnd" @change="onLunchChange('end', $event)" />
        </div>
      </div>
      <p class="dnd__hint">午休需满足：结束晚于开始，时长 10 分钟到 5 小时。</p>
      <p v-if="lunchError" class="dnd__error">{{ lunchError }}</p>

      <div class="dnd__header">
        <span class="dnd__label">自定义免打扰时段（最多 5 个）</span>
        <button type="button" class="dnd__add" @click="addBreak">+ 添加</button>
      </div>
      <p class="dnd__hint">自定义时段支持跨天，例如 22:00–02:00。</p>

      <p v-if="modelValue.customBreaks.length === 0" class="dnd__empty">
        暂无自定义时段，点击 + 添加
      </p>

      <div v-for="(item, index) in modelValue.customBreaks" :key="index" class="dnd__break">
        <input
          class="dnd__name"
          type="text"
          placeholder="名称"
          :value="item.name"
          @change="onBreakChange(index, 'name', $event)"
        />
        <div class="dnd__times">
          <input type="time" :value="item.start" @change="onBreakChange(index, 'start', $event)" />
          <span>—</span>
          <input type="time" :value="item.end" @change="onBreakChange(index, 'end', $event)" />
        </div>
        <button type="button" class="dnd__remove" title="删除时段" @click="removeBreak(index)">
          ✕
        </button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dnd {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: 14px;
}

.dnd__row,
.dnd__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dnd__label {
  font-size: 13px;
  color: var(--hc-color-text);
}

.dnd__times {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--hc-color-text-muted);
}

.dnd__times input {
  width: 94px;
  padding: 6px 7px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  background: #fff;
  border: 1px solid var(--hc-color-border);
  border-radius: 8px;
}

.dnd__hint,
.dnd__empty {
  font-size: 11px;
  line-height: 1.5;
  color: var(--hc-color-text-muted);
}

.dnd__error {
  font-size: 11px;
  line-height: 1.5;
  color: var(--hc-color-danger);
}

.dnd__add {
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--hc-color-brand-deep);
  background: #eef2ff;
  border: 1px solid #ddd6fe;
  border-radius: var(--hc-radius-pill);
}

.dnd__break {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--hc-color-border);
  border-radius: 8px;
}

.dnd__name {
  flex: 1;
  min-width: 70px;
  padding: 6px;
  font-size: 12px;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: 8px;
}

.dnd__remove {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  color: var(--hc-color-danger);
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 50%;
  font-size: 11px;
}

@media (max-width: 520px) {
  .dnd__break {
    flex-wrap: wrap;
  }

  .dnd__name {
    flex-basis: 100%;
  }
}
</style>
