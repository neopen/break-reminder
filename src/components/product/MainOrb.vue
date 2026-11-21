<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useAppStore } from '@/stores/app'
import type { ParameterKind } from '@/types/ui'

const emit = defineEmits<{
  (event: 'open-settings', kind: ParameterKind): void
}>()

const store = useAppStore()
const { config, scheduler, remainingSeconds, loading } = storeToRefs(store)

const hovering = ref(false)
const focusWithin = ref(false)
const orbitVisible = computed(() => hovering.value || focusWithin.value)

const isRunning = computed(() => scheduler.value.running)

const RING_RADIUS = 110
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const displayValue = computed(() => {
  if (!isRunning.value) return config.value.intervalMinutes

  const seconds = remainingSeconds.value
  if (seconds === null) return config.value.intervalMinutes
  return seconds < 60 ? seconds : Math.ceil(seconds / 60)
})

const unitLabel = computed(() => {
  if (!isRunning.value) return '分钟间隔'

  const seconds = remainingSeconds.value
  return seconds !== null && seconds < 60 ? '秒后提醒' : '分钟后提醒'
})

const actionHint = computed(() => {
  if (loading.value) return '处理中…'
  return isRunning.value ? '点击停止' : '点击开始'
})

const dashOffset = computed(() => {
  if (!isRunning.value || remainingSeconds.value === null) return RING_CIRCUMFERENCE

  const total = Math.max(1, config.value.intervalMinutes * 60)
  const elapsed = Math.min(1, Math.max(0, 1 - remainingSeconds.value / total))
  return RING_CIRCUMFERENCE * (1 - elapsed)
})

interface ParameterChip {
  key: ParameterKind
  slot: string
  icon: string
  label: string
  value: string
}

const chips = computed<ParameterChip[]>(() => [
  {
    key: 'interval',
    slot: 'l1',
    icon: '⏱',
    label: '提醒间隔',
    value: `${config.value.intervalMinutes} 分`,
  },
  {
    key: 'duration',
    slot: 'l2',
    icon: '🧘',
    label: '休息时长',
    value: `${config.value.lockMinutes} 分`,
  },
  {
    key: 'schedule',
    slot: 'l3',
    icon: '🗓',
    label: '工作时段',
    value: `${config.value.startTime}–${config.value.endTime}`,
  },
  {
    key: 'mode',
    slot: 'r1',
    icon: config.value.notificationType === 'lock' ? '🔒' : '🔔',
    label: '提醒方式',
    value: config.value.notificationType === 'lock' ? '锁屏' : '通知',
  },
  {
    key: 'sound',
    slot: 'r2',
    icon: '🔊',
    label: '提示声音',
    value: config.value.soundEnabled ? '开' : '关',
  },
  {
    key: 'dnd',
    slot: 'r3',
    icon: '🌙',
    label: '免打扰',
    value: config.value.doNotDisturb.enabled ? '开' : '关',
  },
])

function onFocusOut(event: FocusEvent): void {
  const next = event.relatedTarget as Node | null
  if (!next || !(event.currentTarget as HTMLElement).contains(next)) {
    focusWithin.value = false
  }
}

function toggleReminder(): void {
  if (loading.value) return
  if (isRunning.value) {
    void store.stop()
  } else {
    void store.start()
  }
}

function openSettings(kind: ParameterKind): void {
  emit('open-settings', kind)
}
</script>

<template>
  <section
    class="orb-stage"
    :class="{ 'orb-stage--open': orbitVisible, 'orb-stage--running': isRunning }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="focusWithin = true"
    @focusout="onFocusOut"
  >
    <div class="orb-stage__halo" aria-hidden="true" />

    <button
      type="button"
      class="orb"
      :class="{ 'orb--running': isRunning }"
      :aria-label="`${unitLabel}，${actionHint}`"
      :disabled="loading"
      @click="toggleReminder"
    >
      <svg class="orb__ring" viewBox="0 0 240 240" aria-hidden="true">
        <defs>
          <linearGradient id="orb-ring-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a78bfa" />
            <stop offset="100%" stop-color="#38bdf8" />
          </linearGradient>
        </defs>
        <circle class="orb__ring-track" cx="120" cy="120" :r="RING_RADIUS" />
        <circle
          class="orb__ring-progress"
          cx="120"
          cy="120"
          :r="RING_RADIUS"
          :style="{ strokeDashoffset: dashOffset }"
        />
      </svg>

      <span class="orb__content">
        <span class="orb__number">{{ displayValue }}</span>
        <span class="orb__unit">{{ unitLabel }}</span>
        <span class="orb__hint">{{ actionHint }}</span>
      </span>
    </button>

    <div class="orbit">
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        class="chip"
        :class="`chip--${chip.slot}`"
        @click="openSettings(chip.key)"
      >
        <span class="chip__icon" aria-hidden="true">{{ chip.icon }}</span>
        <span class="chip__text">
          <span class="chip__label">{{ chip.label }}</span>
          <span class="chip__value">{{ chip.value }}</span>
        </span>
      </button>
    </div>

    <div v-if="isRunning" class="quick-actions">
      <button type="button" @click="store.snooze(5)">稍后 5 分</button>
      <button type="button" @click="store.snooze(10)">稍后 10 分</button>
      <button type="button" @click="store.snooze(30)">稍后 30 分</button>
      <button type="button" @click="store.skip()">跳过本次</button>
    </div>
  </section>
</template>

<style scoped>
.orb-stage {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  min-height: 440px;
}

/* 圆形按钮背后的光晕 */
.orb-stage__halo {
  position: absolute;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(124, 92, 255, 0.3) 0%,
    rgba(56, 189, 248, 0.1) 45%,
    transparent 70%
  );
  filter: blur(18px);
  opacity: 0.55;
  transition: opacity var(--hc-duration-normal) var(--hc-ease);
  animation: halo-breathe 6s ease-in-out infinite;
  pointer-events: none;
}

.orb-stage--running .orb-stage__halo {
  opacity: 0.9;
}

.orb {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 232px;
  height: 232px;
  padding: 0;
  color: #f4f6ff;
  background:
    radial-gradient(circle at 50% 28%, rgba(139, 124, 255, 0.34), transparent 62%),
    radial-gradient(circle at 50% 105%, rgba(56, 189, 248, 0.22), transparent 58%),
    rgba(15, 19, 38, 0.74);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 50%;
  box-shadow:
    inset 0 0 60px rgba(124, 92, 255, 0.16),
    0 30px 80px -32px rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(18px);
  transition:
    transform var(--hc-duration-normal) var(--hc-ease),
    box-shadow var(--hc-duration-normal) var(--hc-ease);
}

.orb:hover {
  transform: scale(1.015);
}

.orb:active {
  transform: scale(0.985);
}

.orb:disabled {
  opacity: 0.7;
}

.orb--running {
  box-shadow:
    inset 0 0 70px rgba(124, 92, 255, 0.28),
    0 0 0 1px rgba(139, 124, 255, 0.18),
    0 34px 90px -32px rgba(88, 52, 205, 0.85);
}

.orb__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
  pointer-events: none;
}

.orb__ring-track {
  fill: none;
  stroke: rgba(255, 255, 255, 0.07);
  stroke-width: 3;
}

.orb__ring-progress {
  fill: none;
  stroke: url(#orb-ring-gradient);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 691.15;
  transition: stroke-dashoffset 1s linear;
  filter: drop-shadow(0 0 6px rgba(139, 124, 255, 0.65));
}

.orb__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  user-select: none;
}

.orb__number {
  font-size: 88px;
  font-weight: 650;
  line-height: 0.95;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.045em;
  background: linear-gradient(180deg, #ffffff 15%, #c3c9ff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 6px 24px rgba(139, 124, 255, 0.35));
}

.orb__unit {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.16em;
  color: rgba(199, 205, 240, 0.72);
}

.orb__hint {
  margin-top: 2px;
  font-size: 10px;
  letter-spacing: 0.08em;
  color: rgba(199, 205, 240, 0.5);
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity var(--hc-duration-normal) var(--hc-ease),
    transform var(--hc-duration-normal) var(--hc-ease);
}

.orb-stage--open .orb__hint {
  opacity: 1;
  transform: translateY(0);
}

/* ---------- 环绕参数入口 ---------- */
.orbit {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

.chip {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 9px;
  width: 142px;
  padding: 9px 11px;
  text-align: left;
  background: rgba(17, 21, 41, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 15px;
  box-shadow: 0 18px 36px -22px rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(14px);
  opacity: 0;
  pointer-events: none;
  transition:
    opacity var(--hc-duration-normal) var(--hc-ease),
    transform var(--hc-duration-normal) var(--hc-ease),
    border-color var(--hc-duration-fast) var(--hc-ease),
    background var(--hc-duration-fast) var(--hc-ease);
}

.chip--l1,
.chip--l2,
.chip--l3 {
  left: 0;
  transform: translate(-18px, -50%) scale(0.92);
}

.chip--r1,
.chip--r2,
.chip--r3 {
  right: 0;
  transform: translate(18px, -50%) scale(0.92);
}

.chip--l1,
.chip--r1 {
  top: calc(50% - 112px);
}

.chip--l2,
.chip--r2 {
  top: 50%;
}

.chip--l3,
.chip--r3 {
  top: calc(50% + 112px);
}

.chip--l1,
.chip--r1 {
  transition-delay: 20ms;
}

.chip--l2,
.chip--r2 {
  transition-delay: 55ms;
}

.chip--l3,
.chip--r3 {
  transition-delay: 90ms;
}

.orb-stage--open .chip {
  opacity: 1;
  pointer-events: auto;
  transform: translate(0, -50%) scale(1);
}

.chip:hover {
  background: rgba(32, 38, 70, 0.92);
  border-color: rgba(167, 139, 250, 0.55);
}

.chip:focus-visible {
  outline: 2px solid #a78bfa;
  outline-offset: 2px;
}

.chip__icon {
  flex: none;
  font-size: 17px;
  line-height: 1;
}

.chip__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.chip__label {
  font-size: 10px;
  letter-spacing: 0.06em;
  color: rgba(199, 205, 240, 0.62);
}

.chip__value {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  color: #f4f6ff;
  font-variant-numeric: tabular-nums;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ---------- 运行中的快捷操作 ---------- */
.quick-actions {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.quick-actions button {
  padding: 6px 13px;
  font-size: 11px;
  white-space: nowrap;
  color: rgba(220, 226, 255, 0.78);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: var(--hc-radius-pill);
  backdrop-filter: blur(10px);
  transition:
    background var(--hc-duration-fast) var(--hc-ease),
    border-color var(--hc-duration-fast) var(--hc-ease),
    color var(--hc-duration-fast) var(--hc-ease);
}

.quick-actions button:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(167, 139, 250, 0.45);
}

@keyframes halo-breathe {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.06);
  }
}

@media (max-width: 580px) {
  .orb-stage {
    flex-direction: column;
    justify-content: flex-start;
    gap: 22px;
    min-height: 0;
    padding: 12px 0 56px;
  }

  .orb-stage__halo {
    top: 50%;
    width: 320px;
    height: 320px;
    transform: translateY(-58%);
  }

  .orb {
    width: 210px;
    height: 210px;
  }

  .orb__number {
    font-size: 76px;
  }

  .orbit {
    position: static;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    pointer-events: auto;
  }

  .chip,
  .chip--l1,
  .chip--l2,
  .chip--l3,
  .chip--r1,
  .chip--r2,
  .chip--r3,
  .orb-stage--open .chip {
    position: static;
    width: auto;
    opacity: 1;
    pointer-events: auto;
    transform: none;
    transition-delay: 0ms;
  }

  .quick-actions {
    bottom: 8px;
  }
}
</style>
