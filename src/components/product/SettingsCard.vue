<script setup lang="ts">
import { storeToRefs } from 'pinia'

import AccordionSection from '@/components/ui/AccordionSection.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import DndEditor from '@/components/product/DndEditor.vue'
import { useAppStore } from '@/stores/app'
import type { AppConfig, DoNotDisturb, NotificationType } from '@/types/desktop'

const store = useAppStore()
const { config, autoLaunch, saving, saved } = storeToRefs(store)

function onTime(field: 'startTime' | 'endTime', event: Event): void {
  const value = (event.target as HTMLInputElement).value
  if (!value) return
  void store.patchConfig({ [field]: value } as Partial<AppConfig>)
}

function onInterval(event: Event): void {
  const input = event.target as HTMLInputElement
  const raw = Number(input.value)
  const value = Number.isFinite(raw) ? Math.min(300, Math.max(10, Math.round(raw / 5) * 5)) : 40
  input.value = String(value)
  void store.patchConfig({ intervalMinutes: value })
}

function onLockMinutes(event: Event): void {
  const input = event.target as HTMLInputElement
  const raw = Number(input.value)
  const value = Number.isFinite(raw) ? Math.min(30, Math.max(1, Math.round(raw))) : 5
  input.value = String(value)
  void store.patchConfig({ lockMinutes: value })
}

function onToggle(field: 'soundEnabled' | 'forceLock' | 'systemLock', value: boolean): void {
  void store.patchConfig({ [field]: value } as Partial<AppConfig>)
}

function onMode(value: NotificationType): void {
  void store.patchConfig({ notificationType: value })
}

function onDnd(value: DoNotDisturb): void {
  void store.patchConfig({ doNotDisturb: value })
}

function onAutostart(): void {
  void store.toggleAutostart()
}
</script>

<template>
  <section class="settings-card">
    <div class="settings-head">
      <span class="settings-head__title">提醒设置</span>
      <span v-if="saving" class="settings-head__state">保存中…</span>
      <span v-else-if="saved" class="settings-head__state settings-head__state--ok">已保存</span>
    </div>

    <AccordionSection title="工作时段" :default-open="true">
      <div class="settings-row">
        <span class="settings-label">工作时段</span>
        <div class="settings-times">
          <input type="time" :value="config.startTime" @change="onTime('startTime', $event)" />
          <span>—</span>
          <input type="time" :value="config.endTime" @change="onTime('endTime', $event)" />
        </div>
      </div>
      <p class="settings-hint">结束早于开始视为跨天时段。</p>

      <div class="settings-row">
        <label class="settings-label" for="interval">提醒间隔</label>
        <div class="settings-number">
          <input
            id="interval"
            type="number"
            min="10"
            max="300"
            step="5"
            :value="config.intervalMinutes"
            @change="onInterval"
          />
          <span>分钟</span>
        </div>
      </div>
      <p class="settings-hint">10–300 分钟，按 5 分钟取整。</p>

      <DndEditor :model-value="config.doNotDisturb" @update:model-value="onDnd" />
    </AccordionSection>

    <AccordionSection title="提醒方式" :default-open="false">
      <ToggleSwitch
        :model-value="config.soundEnabled"
        label="声音提示"
        description="提醒时播放提示音"
        @update:model-value="onToggle('soundEnabled', $event)"
      />

      <div class="mode-grid">
        <label class="mode" :class="{ 'mode--active': config.notificationType === 'desktop' }">
          <input
            type="radio"
            name="notification-type"
            value="desktop"
            :checked="config.notificationType === 'desktop'"
            @change="onMode('desktop')"
          />
          <strong>桌面通知</strong>
          <span>弹窗提醒</span>
          <span v-if="config.notificationType === 'desktop'" class="mode__check">✓</span>
        </label>
        <label class="mode" :class="{ 'mode--active': config.notificationType === 'lock' }">
          <input
            type="radio"
            name="notification-type"
            value="lock"
            :checked="config.notificationType === 'lock'"
            @change="onMode('lock')"
          />
          <strong>锁屏通知</strong>
          <span>全屏强制休息</span>
          <span v-if="config.notificationType === 'lock'" class="mode__check">✓</span>
        </label>
      </div>

      <p class="settings-hint">
        {{ config.notificationType === 'desktop' ? '需要系统通知权限' : '全屏提醒，适合强制休息' }}
      </p>

      <template v-if="config.notificationType === 'lock'">
        <div class="settings-row">
          <label class="settings-label" for="lock-minutes">锁屏时长</label>
          <div class="settings-number">
            <input
              id="lock-minutes"
              type="number"
              min="1"
              max="30"
              step="1"
              :value="config.lockMinutes"
              @change="onLockMinutes"
            />
            <span>分钟</span>
          </div>
        </div>
        <p class="settings-hint">1–30 分钟。</p>

        <ToggleSwitch
          :model-value="config.forceLock"
          label="强制锁屏"
          description="倒计时结束前无法关闭"
          @update:model-value="onToggle('forceLock', $event)"
        />
      </template>
    </AccordionSection>

    <AccordionSection title="系统设置" :default-open="false">
      <ToggleSwitch
        :model-value="autoLaunch"
        label="开机启动"
        description="登录系统后自动运行"
        @update:model-value="onAutostart"
      />
      <p class="settings-hint">仅安装版生效。</p>

      <ToggleSwitch
        :model-value="config.systemLock"
        label="系统锁屏"
        description="提醒结束后锁定电脑"
        @update:model-value="onToggle('systemLock', $event)"
      />
      <p class="settings-hint">关闭窗口会隐藏到托盘；右键托盘图标可退出应用。</p>
    </AccordionSection>
  </section>
</template>

<style scoped>
.settings-card {
  padding: 0 18px;
  background: var(--hc-color-surface);
  border: 1px solid var(--hc-color-border);
  border-radius: 24px;
  box-shadow: var(--hc-shadow-soft);
}

.settings-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--hc-color-text-muted);
}

.settings-head__state {
  font-weight: 500;
}

.settings-head__state--ok {
  color: var(--hc-color-success);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
}

.settings-label {
  font-size: 13px;
  color: var(--hc-color-text);
}

.settings-times {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--hc-color-text-muted);
}

.settings-times input {
  width: 100px;
  padding: 6px 8px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: 8px;
}

.settings-number {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--hc-color-text-muted);
}

.settings-number input {
  width: 66px;
  padding: 6px 8px;
  font-size: 13px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: 8px;
}

.settings-hint {
  font-size: 11px;
  line-height: 1.5;
  color: var(--hc-color-text-muted);
}

.settings-warning {
  font-size: 11px;
  line-height: 1.5;
  color: #92400e;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.mode {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 10px;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: 12px;
  cursor: pointer;
  transition:
    border-color var(--hc-duration-fast) var(--hc-ease),
    background var(--hc-duration-fast) var(--hc-ease);
}

.mode input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.mode strong {
  font-size: 13px;
}

.mode span {
  font-size: 11px;
  color: var(--hc-color-text-muted);
}

.mode--active {
  background: #eef2ff;
  border-color: var(--hc-color-brand);
}

.mode__check {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 10px;
  color: #fff;
  background: var(--hc-color-brand);
  border-radius: 50%;
}
</style>
