<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import AppButton from '@/components/AppButton.vue'
import DndEditor from '@/components/product/DndEditor.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useAppStore } from '@/stores/app'
import type { AppConfig, DoNotDisturb, NotificationType } from '@/types/desktop'
import type { ParameterKind } from '@/types/ui'

const props = defineProps<{ kind: ParameterKind | null }>()
const emit = defineEmits<{ (event: 'close'): void }>()

const store = useAppStore()
const { config, stats, autoLaunch, saving, saved } = storeToRefs(store)
const { confirm } = useConfirm()

const META: Record<ParameterKind, { icon: string; title: string; subtitle: string }> = {
  interval: { icon: '⏱', title: '提醒间隔', subtitle: '多久提醒你起来活动一次' },
  duration: { icon: '🧘', title: '休息时长', subtitle: '锁屏休息倒计时的时长' },
  schedule: { icon: '🗓', title: '工作时段', subtitle: '只在设定时段内触发提醒' },
  mode: { icon: '🔔', title: '提醒方式', subtitle: '弹窗通知，或全屏强制休息' },
  sound: { icon: '🔊', title: '提示声音', subtitle: '提醒时播放提示音' },
  dnd: { icon: '🌙', title: '免打扰', subtitle: '午休与自定义时段内不提醒' },
  system: { icon: '⚙', title: '系统与统计', subtitle: '开机启动、系统锁屏与今日数据' },
}

const meta = computed(() => META[props.kind ?? 'interval'])

const panelRef = ref<HTMLElement | null>(null)
const draftInterval = ref(config.value.intervalMinutes)

const intervalFill = computed(() => `${((draftInterval.value - 10) / (300 - 10)) * 100}%`)

const INTERVAL_PRESETS = [20, 30, 40, 60, 90]
const DURATION_PRESETS = [1, 3, 5, 10, 15]
const SCHEDULE_PRESETS = [
  { label: '08:00–18:00', start: '08:00', end: '18:00' },
  { label: '09:00–18:00', start: '09:00', end: '18:00' },
  { label: '09:00–21:00', start: '09:00', end: '21:00' },
]

watch(
  () => config.value.intervalMinutes,
  (value) => {
    draftInterval.value = value
  },
)

watch(
  () => props.kind,
  async (kind) => {
    if (!kind) {
      window.removeEventListener('keydown', onKeydown)
      return
    }

    draftInterval.value = config.value.intervalMinutes
    window.addEventListener('keydown', onKeydown)
    await nextTick()
    panelRef.value?.focus()
  },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function close(): void {
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

function onIntervalInput(event: Event): void {
  draftInterval.value = Number((event.target as HTMLInputElement).value)
}

function commitInterval(): void {
  const value = Math.min(300, Math.max(10, Math.round(draftInterval.value / 5) * 5))
  draftInterval.value = value
  if (value !== config.value.intervalMinutes) {
    void store.patchConfig({ intervalMinutes: value })
  }
}

function setIntervalPreset(value: number): void {
  draftInterval.value = value
  commitInterval()
}

function bumpLock(delta: number): void {
  const value = Math.min(30, Math.max(1, config.value.lockMinutes + delta))
  if (value !== config.value.lockMinutes) {
    void store.patchConfig({ lockMinutes: value })
  }
}

function onTime(field: 'startTime' | 'endTime', event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (!value) return
  void store.patchConfig({ [field]: value } as Partial<AppConfig>)
}

function applySchedule(start: string, end: string): void {
  void store.patchConfig({ startTime: start, endTime: end })
}

function onToggle(field: 'soundEnabled' | 'forceLock' | 'systemLock', value: boolean): void {
  void store.patchConfig({ [field]: value } as Partial<AppConfig>)
}

function setMode(value: NotificationType): void {
  if (value === config.value.notificationType) return
  void store.patchConfig({ notificationType: value })
}

function onDnd(value: DoNotDisturb): void {
  void store.patchConfig({ doNotDisturb: value })
}

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
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="kind" class="sheet-backdrop" @click.self="close">
        <div
          ref="panelRef"
          class="sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parameter-title"
          tabindex="-1"
        >
          <header class="sheet__head">
            <span class="sheet__icon" aria-hidden="true">{{ meta.icon }}</span>
            <div class="sheet__heading">
              <h2 id="parameter-title" class="sheet__title">{{ meta.title }}</h2>
              <p class="sheet__subtitle">{{ meta.subtitle }}</p>
            </div>
            <span v-if="saving" class="sheet__state">保存中…</span>
            <span v-else-if="saved" class="sheet__state sheet__state--ok">已保存</span>
            <button type="button" class="sheet__close" aria-label="关闭" @click="close">✕</button>
          </header>

          <div class="sheet__body">
            <!-- 提醒间隔 -->
            <template v-if="kind === 'interval'">
              <div class="display">
                <strong>{{ draftInterval }}</strong>
                <span>分钟</span>
              </div>

              <input
                class="slider"
                type="range"
                min="10"
                max="300"
                step="5"
                :value="draftInterval"
                :style="{ '--fill': intervalFill }"
                aria-label="提醒间隔（分钟）"
                @input="onIntervalInput"
                @change="commitInterval"
              />

              <div class="preset-row">
                <button
                  v-for="preset in INTERVAL_PRESETS"
                  :key="preset"
                  type="button"
                  class="preset"
                  :class="{ 'preset--active': draftInterval === preset }"
                  @click="setIntervalPreset(preset)"
                >
                  {{ preset }}
                </button>
              </div>

              <p class="hint">10–300 分钟，按 5 分钟取整。</p>
            </template>

            <!-- 休息时长 -->
            <template v-else-if="kind === 'duration'">
              <div class="stepper">
                <button type="button" aria-label="减少休息时长" @click="bumpLock(-1)">−</button>
                <div class="display display--compact">
                  <strong>{{ config.lockMinutes }}</strong>
                  <span>分钟</span>
                </div>
                <button type="button" aria-label="增加休息时长" @click="bumpLock(1)">+</button>
              </div>

              <div class="preset-row">
                <button
                  v-for="preset in DURATION_PRESETS"
                  :key="preset"
                  type="button"
                  class="preset"
                  :class="{ 'preset--active': config.lockMinutes === preset }"
                  @click="bumpLock(preset - config.lockMinutes)"
                >
                  {{ preset }}
                </button>
              </div>

              <ToggleSwitch
                :model-value="config.forceLock"
                label="强制锁屏"
                description="倒计时结束前无法关闭休息窗口"
                @update:model-value="onToggle('forceLock', $event)"
              />

              <p v-if="config.notificationType !== 'lock'" class="hint hint--warn">
                当前为桌面通知模式，休息时长仅在锁屏模式下生效。
              </p>
            </template>

            <!-- 工作时段 -->
            <template v-else-if="kind === 'schedule'">
              <div class="time-row">
                <label class="time-field">
                  <span>开始</span>
                  <input
                    type="time"
                    :value="config.startTime"
                    @change="onTime('startTime', $event)"
                  />
                </label>
                <span class="time-dash" aria-hidden="true">—</span>
                <label class="time-field">
                  <span>结束</span>
                  <input type="time" :value="config.endTime" @change="onTime('endTime', $event)" />
                </label>
              </div>

              <div class="preset-row">
                <button
                  v-for="range in SCHEDULE_PRESETS"
                  :key="range.label"
                  type="button"
                  class="preset preset--wide"
                  :class="{
                    'preset--active':
                      config.startTime === range.start && config.endTime === range.end,
                  }"
                  @click="applySchedule(range.start, range.end)"
                >
                  {{ range.label }}
                </button>
              </div>

              <p class="hint">结束早于开始视为跨天时段。</p>
            </template>

            <!-- 提醒方式 -->
            <template v-else-if="kind === 'mode'">
              <div class="mode-grid">
                <button
                  type="button"
                  class="mode-card"
                  :class="{ 'mode-card--active': config.notificationType === 'desktop' }"
                  @click="setMode('desktop')"
                >
                  <span class="mode-card__icon" aria-hidden="true">🔔</span>
                  <strong>桌面通知</strong>
                  <span>系统弹窗提醒，不打断当前工作</span>
                  <span
                    v-if="config.notificationType === 'desktop'"
                    class="mode-card__check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </button>

                <button
                  type="button"
                  class="mode-card"
                  :class="{ 'mode-card--active': config.notificationType === 'lock' }"
                  @click="setMode('lock')"
                >
                  <span class="mode-card__icon" aria-hidden="true">🔒</span>
                  <strong>锁屏通知</strong>
                  <span>全屏强制休息，适合久坐防护</span>
                  <span
                    v-if="config.notificationType === 'lock'"
                    class="mode-card__check"
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </button>
              </div>

              <p class="hint">
                {{
                  config.notificationType === 'desktop'
                    ? '启动提醒时会请求系统通知权限。'
                    : '全屏提醒会覆盖当前屏幕，可选择强制锁屏。'
                }}
              </p>
            </template>

            <!-- 提示声音 -->
            <template v-else-if="kind === 'sound'">
              <div class="sound-card" :class="{ 'sound-card--on': config.soundEnabled }">
                <span class="sound-card__icon" aria-hidden="true">🔊</span>
                <div>
                  <strong>{{ config.soundEnabled ? '提示音已开启' : '提示音已关闭' }}</strong>
                  <span>提醒触发时播放轻柔的提示音</span>
                </div>
              </div>

              <ToggleSwitch
                :model-value="config.soundEnabled"
                label="声音提示"
                description="提醒时播放提示音"
                @update:model-value="onToggle('soundEnabled', $event)"
              />
            </template>

            <!-- 免打扰 -->
            <template v-else-if="kind === 'dnd'">
              <DndEditor :model-value="config.doNotDisturb" @update:model-value="onDnd" />
              <p class="hint">免打扰时段不会触发提醒，也计入正常工作时间。</p>
            </template>

            <!-- 系统与统计 -->
            <template v-else-if="kind === 'system'">
              <ToggleSwitch
                :model-value="autoLaunch"
                label="开机启动"
                description="登录系统后自动运行（仅安装版生效）"
                @update:model-value="store.toggleAutostart()"
              />

              <ToggleSwitch
                :model-value="config.systemLock"
                label="系统锁屏"
                description="休息结束后锁定电脑"
                @update:model-value="onToggle('systemLock', $event)"
              />

              <div class="stat-grid">
                <div class="stat">
                  <strong
                    >{{ stats.todayCount }}<small>/{{ stats.dailyTarget }}</small></strong
                  >
                  <span>今日活动</span>
                </div>
                <div class="stat">
                  <strong>{{ stats.continuousDays }}</strong>
                  <span>连续打卡</span>
                </div>
                <div class="stat">
                  <strong>{{ stats.weeklyRate }}%</strong>
                  <span>本周完成</span>
                </div>
              </div>

              <AppButton variant="ghost" block @click="resetToday">重置今日统计</AppButton>

              <p class="hint">关闭窗口会隐藏到托盘；右键托盘图标可退出应用。</p>
            </template>
          </div>

          <footer class="sheet__foot">
            <AppButton variant="secondary" block @click="close">完成</AppButton>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.sheet-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--hc-space-4);
  background: rgba(5, 8, 20, 0.66);
  backdrop-filter: blur(8px);
}

.sheet {
  width: min(440px, 100%);
  max-height: min(86vh, 640px);
  padding: var(--hc-space-5);
  overflow-y: auto;
  color: #eef2ff;
  background: linear-gradient(160deg, rgba(29, 34, 64, 0.98), rgba(13, 16, 32, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 26px;
  box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.9);
  outline: none;

  /* 让复用的 ToggleSwitch / DndEditor 跟随深色面板 */
  color-scheme: dark;
  --hc-color-text: #eef2ff;
  --hc-color-text-muted: #c7cdf0;
  --hc-color-text-faint: #8d94bd;
  --hc-color-surface: #171b32;
  --hc-color-surface-soft: rgba(255, 255, 255, 0.06);
  --hc-color-border: rgba(255, 255, 255, 0.12);
  --hc-color-brand-deep: #c4b5fd;
}

.sheet__head {
  display: flex;
  align-items: center;
  gap: var(--hc-space-3);
}

.sheet__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 19px;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.32), rgba(56, 189, 248, 0.18));
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 14px;
}

.sheet__heading {
  flex: 1;
  min-width: 0;
}

.sheet__title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.sheet__subtitle {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: #8d94bd;
}

.sheet__state {
  flex-shrink: 0;
  font-size: 11px;
  color: #8d94bd;
}

.sheet__state--ok {
  color: #6ee7b7;
}

.sheet__close {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  font-size: 13px;
  color: #8d94bd;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  transition:
    color var(--hc-duration-fast) var(--hc-ease),
    background var(--hc-duration-fast) var(--hc-ease);
}

.sheet__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.sheet__body {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-4);
  margin-top: var(--hc-space-5);
}

.sheet__foot {
  margin-top: var(--hc-space-5);
}

.display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8px;
}

.display strong {
  font-size: 56px;
  font-weight: 650;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.03em;
  background: linear-gradient(180deg, #ffffff, #b9c1ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.display span {
  font-size: 13px;
  color: #8d94bd;
}

.display--compact strong {
  font-size: 44px;
}

.slider {
  width: 100%;
  height: 6px;
  appearance: none;
  background: linear-gradient(
    90deg,
    #a78bfa 0%,
    #38bdf8 var(--fill),
    rgba(255, 255, 255, 0.1) var(--fill)
  );
  border-radius: 999px;
  outline: none;
}

.slider::-webkit-slider-thumb {
  width: 20px;
  height: 20px;
  appearance: none;
  background: #fff;
  border: 3px solid #8b7cff;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(139, 124, 255, 0.7);
  cursor: pointer;
}

.slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: #fff;
  border: 3px solid #8b7cff;
  border-radius: 50%;
  box-shadow: 0 0 14px rgba(139, 124, 255, 0.7);
  cursor: pointer;
}

.preset-row {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
}

.preset {
  flex: 1;
  min-width: 48px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #a9b0d4;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: var(--hc-radius-pill);
  font-variant-numeric: tabular-nums;
  transition:
    color var(--hc-duration-fast) var(--hc-ease),
    background var(--hc-duration-fast) var(--hc-ease),
    border-color var(--hc-duration-fast) var(--hc-ease);
}

.preset:hover {
  color: #fff;
  border-color: rgba(167, 139, 250, 0.5);
}

.preset--active {
  color: #fff;
  background: rgba(124, 92, 255, 0.24);
  border-color: rgba(167, 139, 250, 0.65);
}

.preset--wide {
  flex-basis: calc(50% - 4px);
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-4);
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--hc-radius-md);
}

.stepper > button {
  width: 40px;
  height: 40px;
  font-size: 20px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  transition: background var(--hc-duration-fast) var(--hc-ease);
}

.stepper > button:hover {
  background: rgba(124, 92, 255, 0.28);
}

.time-row {
  display: flex;
  align-items: center;
  gap: var(--hc-space-2);
}

.time-field {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 5px;
  font-size: 11px;
  color: #8d94bd;
}

.time-field input {
  padding: 9px 10px;
  font-size: 15px;
  color: #eef2ff;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-variant-numeric: tabular-nums;
}

.time-field input:focus {
  border-color: rgba(167, 139, 250, 0.6);
  outline: none;
}

.time-dash {
  padding-top: 16px;
  color: #8d94bd;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--hc-space-2);
}

.mode-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: var(--hc-space-3);
  text-align: left;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 16px;
  transition:
    background var(--hc-duration-fast) var(--hc-ease),
    border-color var(--hc-duration-fast) var(--hc-ease);
}

.mode-card:hover {
  background: rgba(255, 255, 255, 0.07);
}

.mode-card--active {
  background: rgba(124, 92, 255, 0.16);
  border-color: rgba(167, 139, 250, 0.6);
}

.mode-card__icon {
  font-size: 20px;
  line-height: 1;
}

.mode-card strong {
  margin-top: 2px;
  font-size: 14px;
  color: #f4f6ff;
}

.mode-card > span:last-of-type {
  font-size: 11px;
  line-height: 1.5;
  color: #8d94bd;
}

.mode-card__check {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 17px;
  height: 17px;
  font-size: 10px;
  color: #fff;
  background: linear-gradient(135deg, #8b7cff, #38bdf8);
  border-radius: 50%;
}

.sound-card {
  display: flex;
  align-items: center;
  gap: var(--hc-space-3);
  padding: var(--hc-space-4);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--hc-radius-md);
  transition: border-color var(--hc-duration-normal) var(--hc-ease);
}

.sound-card--on {
  border-color: rgba(167, 139, 250, 0.45);
  box-shadow: inset 0 0 40px rgba(124, 92, 255, 0.12);
}

.sound-card__icon {
  font-size: 26px;
  line-height: 1;
}

.sound-card div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sound-card strong {
  font-size: 14px;
}

.sound-card div span {
  font-size: 11px;
  color: #8d94bd;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--hc-space-2);
  padding: var(--hc-space-3) 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.stat {
  text-align: center;
}

.stat strong {
  display: block;
  font-size: 22px;
  font-weight: 700;
  color: #f4f6ff;
  font-variant-numeric: tabular-nums;
}

.stat small {
  font-size: 11px;
  font-weight: 500;
  color: #8d94bd;
}

.stat span {
  display: block;
  margin-top: 2px;
  font-size: 10px;
  color: #8d94bd;
}

.hint {
  font-size: 11px;
  line-height: 1.6;
  color: #8d94bd;
}

.hint--warn {
  color: #fbbf24;
}

/* 弹层过渡 */
.sheet-enter-active,
.sheet-leave-active {
  transition: opacity var(--hc-duration-normal) var(--hc-ease);
}

.sheet-enter-active .sheet,
.sheet-leave-active .sheet {
  transition:
    transform var(--hc-duration-normal) var(--hc-ease),
    opacity var(--hc-duration-normal) var(--hc-ease);
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .sheet,
.sheet-leave-to .sheet {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}

@media (max-width: 480px) {
  .mode-grid {
    grid-template-columns: 1fr;
  }
}
</style>
