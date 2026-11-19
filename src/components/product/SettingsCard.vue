<script setup lang="ts">
import { storeToRefs } from 'pinia'

import AccordionSection from '@/components/ui/AccordionSection.vue'
import ToggleSwitch from '@/components/ui/ToggleSwitch.vue'
import DndEditor from '@/components/product/DndEditor.vue'
import { useConfirm } from '@/composables/useConfirm'
import { quitApp } from '@/services/desktop'
import { useAppStore } from '@/stores/app'
import type { AppConfig, DoNotDisturb, NotificationType } from '@/types/desktop'

const store = useAppStore()
const { config, autoLaunch } = storeToRefs(store)
const { confirm } = useConfirm()

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

async function quit(): Promise<void> {
  const confirmed = await confirm({
    title: '退出 Breakly',
    message: '退出后将不再提醒，确定要退出吗？',
    confirmText: '退出',
    cancelText: '取消',
    tone: 'danger',
  })

  if (confirmed) {
    await quitApp()
  }
}
</script>

<template>
  <section class="settings-card">
    <AccordionSection title="提醒时间段" :default-open="true">
      <div class="settings-row">
        <span class="settings-label">提醒时间段</span>
        <div class="settings-times">
          <input type="time" :value="config.startTime" @change="onTime('startTime', $event)" />
          <span>—</span>
          <input type="time" :value="config.endTime" @change="onTime('endTime', $event)" />
        </div>
      </div>

      <div class="settings-row">
        <label class="settings-label" for="interval">每间隔</label>
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
      <p class="settings-hint">范围 10 ~ 300 分钟，按 5 分钟就近取整。</p>

      <DndEditor :model-value="config.doNotDisturb" @update:model-value="onDnd" />
    </AccordionSection>

    <AccordionSection title="通知方式" :default-open="true">
      <ToggleSwitch
        :model-value="config.soundEnabled"
        label="🔊 开启声音提示"
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
        </label>
      </div>

      <p class="settings-hint">
        {{
          config.notificationType === 'desktop'
            ? '💡 桌面通知：弹窗提醒（需开启系统通知权限）'
            : '💡 锁屏通知：全屏锁屏，强制休息'
        }}
      </p>

      <template v-if="config.notificationType === 'lock'">
        <div class="settings-row">
          <label class="settings-label" for="lock-minutes">锁屏</label>
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
        <p class="settings-hint">范围 1 ~ 30 分钟。</p>

        <ToggleSwitch
          :model-value="config.forceLock"
          label="强制锁屏"
          @update:model-value="onToggle('forceLock', $event)"
        />
        <p class="settings-warning">⚠️ 强制锁屏开启后，提醒期间无法关闭，必须等待倒计时结束</p>
      </template>
    </AccordionSection>

    <AccordionSection title="其他设置" :default-open="false">
      <ToggleSwitch
        :model-value="autoLaunch"
        label="🖥️ 开机启动"
        @update:model-value="onAutostart"
      />
      <p class="settings-warning">⚠️ 仅支持安装版，不支持便携版。</p>

      <ToggleSwitch
        :model-value="config.systemLock"
        label="🔐 系统锁屏"
        @update:model-value="onToggle('systemLock', $event)"
      />
      <p class="settings-warning">⚠️ 倒计时结束后将启动系统锁屏。</p>

      <button type="button" class="settings-quit" @click="quit">退出应用</button>
    </AccordionSection>
  </section>
</template>

<style scoped>
.settings-card {
  padding: 0 var(--hc-space-5);
  background: var(--hc-color-surface);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-lg);
  box-shadow: var(--hc-shadow-soft);
}

.settings-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
}

.settings-label {
  font-size: 14px;
  color: var(--hc-color-text);
}

.settings-times {
  display: flex;
  align-items: center;
  gap: var(--hc-space-2);
  color: var(--hc-color-text-muted);
}

.settings-times input {
  width: 112px;
  padding: 8px 10px;
  font-size: 14px;
  font-variant-numeric: tabular-nums;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-sm);
}

.settings-number {
  display: flex;
  align-items: center;
  gap: var(--hc-space-2);
  font-size: 13px;
  color: var(--hc-color-text-muted);
}

.settings-number input {
  width: 78px;
  padding: 8px 10px;
  font-size: 14px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-sm);
}

.settings-hint {
  font-size: 12px;
  line-height: 1.6;
  color: var(--hc-color-text-muted);
}

.settings-warning {
  font-size: 12px;
  line-height: 1.6;
  color: #92400e;
}

.mode-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--hc-space-2);
}

.mode {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--hc-space-3);
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-md);
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
  font-size: 14px;
}

.mode span {
  font-size: 12px;
  color: var(--hc-color-text-muted);
}

.mode--active {
  background: #eef2ff;
  border-color: var(--hc-color-brand);
}

.settings-quit {
  align-self: flex-start;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--hc-color-danger);
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.24);
  border-radius: var(--hc-radius-sm);
}
</style>
