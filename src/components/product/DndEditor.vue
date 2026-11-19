<script setup lang="ts">
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { useToast } from '@/composables/useToast'
import type { CustomBreak, DoNotDisturb } from '@/types/desktop'

const props = defineProps<{
  modelValue: DoNotDisturb
}>()

const emit = defineEmits<{
  'update:modelValue': [value: DoNotDisturb]
}>()

const { show } = useToast()

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
  emitPatch({
    lunchBreak: {
      ...props.modelValue.lunchBreak,
      [field]: value,
    },
  })
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
          <input
            type="time"
            :value="modelValue.lunchBreak.start"
            @change="onLunchChange('start', $event)"
          />
          <span>—</span>
          <input
            type="time"
            :value="modelValue.lunchBreak.end"
            @change="onLunchChange('end', $event)"
          />
        </div>
      </div>
      <p class="dnd__hint">午休需满足：结束晚于开始，时长 10 分钟到 5 小时。</p>

      <div class="dnd__header">
        <span class="dnd__label">自定义免打扰时段（最多 5 个）</span>
        <button type="button" class="dnd__add" @click="addBreak">+ 添加</button>
      </div>

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
  gap: var(--hc-space-3);
  padding: var(--hc-space-4);
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-md);
}

.dnd__row,
.dnd__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
}

.dnd__label {
  font-size: 14px;
  color: var(--hc-color-text);
}

.dnd__times {
  display: flex;
  align-items: center;
  gap: var(--hc-space-2);
  color: var(--hc-color-text-muted);
}

.dnd__times input {
  width: 104px;
  padding: 7px 8px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  background: #fff;
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-sm);
}

.dnd__hint,
.dnd__empty {
  font-size: 12px;
  line-height: 1.6;
  color: var(--hc-color-text-muted);
}

.dnd__add {
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--hc-color-brand-deep);
  background: #eef2ff;
  border: 1px solid #ddd6fe;
  border-radius: var(--hc-radius-pill);
}

.dnd__break {
  display: flex;
  align-items: center;
  gap: var(--hc-space-2);
  padding: var(--hc-space-2);
  background: #fff;
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-sm);
}

.dnd__name {
  flex: 1;
  min-width: 80px;
  padding: 7px 8px;
  font-size: 13px;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-sm);
}

.dnd__remove {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  color: var(--hc-color-danger);
  background: rgba(239, 68, 68, 0.1);
  border: none;
  border-radius: 50%;
  font-size: 12px;
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
