<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { getVersion } from '@tauri-apps/api/app'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import {
  disable as disableAutostart,
  enable as enableAutostart,
  isEnabled as isAutostartEnabled,
} from '@tauri-apps/plugin-autostart'
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification'
import { relaunch } from '@tauri-apps/plugin-process'
import { check, type Update } from '@tauri-apps/plugin-updater'

import AppButton from './components/AppButton.vue'
import AppCard from './components/AppCard.vue'
import StatusPill from './components/StatusPill.vue'
import {
  getRuntimeStatus,
  isDesktopRuntime,
  openLockWindow,
  setKeyboardBlocking,
  type RuntimeStatus,
} from './services/desktop'

interface AudioAutoplayPayload {
  ok: boolean
  detail: string
  playedCount: number
}

const desktop = isDesktopRuntime()
const version = ref('0.7.0')
const platform = ref(desktop ? 'unknown' : 'web')
const status = ref<RuntimeStatus>({
  blocking: false,
  hookInstalled: false,
  platformSupported: false,
  platform: desktop ? 'unknown' : 'web',
})
const duration = ref(30)
const busy = ref('')
const error = ref('')
const notice = ref('')
const autoLaunch = ref(false)
const updateState = ref<'idle' | 'checking' | 'available' | 'latest' | 'installing'>('idle')
const updateMessage = ref('')
const availableUpdate = ref<{ version: string } | null>(null)
const audioResult = ref<AudioAutoplayPayload | null>(null)

let pendingUpdate: Update | null = null
let pollTimer: number | undefined
let unlistenAudio: UnlistenFn | undefined
let disposed = false

const platformLabel = computed(() => {
  const map: Record<string, string> = {
    windows: 'Windows',
    macos: 'macOS',
    linux: 'Linux',
    web: '浏览器',
  }
  return map[platform.value] ?? platform.value
})

const blockingLabel = computed(() => {
  if (!desktop) return '预览模式不可用'
  if (!status.value.platformSupported) return '当前平台暂未实现'
  if (status.value.blocking) return '已拦截'
  return '未拦截'
})

const blockingTone = computed<'ok' | 'warn' | 'off'>(() => {
  if (!desktop || !status.value.platformSupported) return 'off'
  return status.value.blocking ? 'ok' : 'warn'
})

const audioLabel = computed(() => {
  if (!audioResult.value) return '尚未测试'
  return audioResult.value.ok ? '自动播放成功' : '被自动播放策略拦截'
})

const audioTone = computed<'ok' | 'warn' | 'off'>(() => {
  if (!audioResult.value) return 'off'
  return audioResult.value.ok ? 'ok' : 'warn'
})

function describeError(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

async function refreshStatus(): Promise<void> {
  if (!desktop) return
  try {
    status.value = await getRuntimeStatus()
    platform.value = status.value.platform
  } catch (cause) {
    console.warn('[desktop] 读取运行状态失败', cause)
  }
}

async function refreshAutostart(): Promise<void> {
  if (!desktop) return
  try {
    autoLaunch.value = await isAutostartEnabled()
  } catch (cause) {
    console.warn('[desktop] 读取开机自启状态失败', cause)
  }
}

async function loadVersion(): Promise<void> {
  if (!desktop) return
  try {
    version.value = await getVersion()
  } catch (cause) {
    console.warn('[desktop] 读取应用版本失败', cause)
  }
}

async function runLockTest(): Promise<void> {
  error.value = ''
  notice.value = ''
  audioResult.value = null
  busy.value = 'lock'
  try {
    await openLockWindow(duration.value, false)
    notice.value = `锁屏遮罩已打开（${duration.value} 秒）。请尝试按字母键、Win 键、Alt+Tab 验证拦截效果。`
    await refreshStatus()
  } catch (cause) {
    error.value = `打开锁屏失败：${describeError(cause)}`
  } finally {
    busy.value = ''
  }
}

async function toggleKeyboard(): Promise<void> {
  error.value = ''
  busy.value = 'keyboard'
  try {
    await setKeyboardBlocking(!status.value.blocking)
    await refreshStatus()
  } catch (cause) {
    error.value = `切换键盘拦截失败：${describeError(cause)}`
  } finally {
    busy.value = ''
  }
}

async function toggleAutostart(): Promise<void> {
  error.value = ''
  busy.value = 'autostart'
  try {
    if (autoLaunch.value) {
      await disableAutostart()
      autoLaunch.value = false
    } else {
      await enableAutostart()
      autoLaunch.value = true
    }
  } catch (cause) {
    error.value = `设置开机自启失败：${describeError(cause)}`
  } finally {
    busy.value = ''
  }
}

async function testNotification(): Promise<void> {
  error.value = ''
  notice.value = ''
  busy.value = 'notification'
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      granted = (await requestPermission()) === 'granted'
    }
    if (!granted) {
      error.value = '通知权限被拒绝，请在系统设置中允许后重试。'
      return
    }
    sendNotification({
      title: '别坐了',
      body: '这是一条来自 Tauri 2 桌面端的测试通知。',
    })
    notice.value = '测试通知已发送。Windows 便携版可能不显示，安装版才会注册系统通知。'
  } catch (cause) {
    error.value = `发送通知失败：${describeError(cause)}`
  } finally {
    busy.value = ''
  }
}

async function checkForUpdates(): Promise<void> {
  error.value = ''
  updateMessage.value = ''
  updateState.value = 'checking'
  try {
    pendingUpdate = await check()
    if (pendingUpdate) {
      availableUpdate.value = { version: pendingUpdate.version }
      updateState.value = 'available'
      updateMessage.value = `发现新版本 v${pendingUpdate.version}`
    } else {
      availableUpdate.value = null
      updateState.value = 'latest'
      updateMessage.value = '当前已是最新版本'
    }
  } catch (cause) {
    const message = describeError(cause)
    if (/valid release JSON|not found|404/i.test(message)) {
      availableUpdate.value = null
      updateState.value = 'latest'
      updateMessage.value = '当前没有可用的发布版本（测试包预期行为）'
    } else {
      updateState.value = 'idle'
      error.value = `检查更新失败：${message}`
    }
  }
}

async function installUpdate(): Promise<void> {
  if (!pendingUpdate) return
  error.value = ''
  updateState.value = 'installing'
  updateMessage.value = '正在下载并安装更新…'
  try {
    await pendingUpdate.downloadAndInstall()
    await relaunch()
  } catch (cause) {
    updateState.value = 'available'
    updateMessage.value = ''
    error.value = `安装更新失败：${describeError(cause)}`
  }
}

onMounted(async () => {
  if (!desktop) return

  await Promise.all([loadVersion(), refreshStatus(), refreshAutostart()])
  pollTimer = window.setInterval(() => {
    void refreshStatus()
  }, 1500)

  unlistenAudio = await listen<AudioAutoplayPayload>('hc-audio-autoplay', (event) => {
    audioResult.value = event.payload
  })
  if (disposed) unlistenAudio?.()
})

onBeforeUnmount(() => {
  disposed = true
  if (pollTimer) window.clearInterval(pollTimer)
  unlistenAudio?.()
})
</script>

<template>
  <main class="app-shell">
    <header class="hero">
      <p class="hero__eyebrow">Tauri 2 · Vue 3 · TypeScript</p>
      <h1 class="hero__title">别坐了</h1>
      <p class="hero__subtitle">健康提醒桌面应用 · 新一代技术底座验证</p>
      <div class="hero__meta">
        <StatusPill
          :tone="desktop ? 'ok' : 'warn'"
          :label="desktop ? '桌面运行时' : '浏览器预览'"
        />
        <span class="hero__version">v{{ version }} · {{ platformLabel }}</span>
      </div>
    </header>

    <p v-if="!desktop" class="alert alert--warn">
      当前在普通浏览器中运行，原生能力已禁用。请使用 <code>npm run desktop:dev</code> 启动 Tauri。
    </p>
    <p v-if="error" class="alert alert--danger">{{ error }}</p>
    <p v-if="notice" class="alert alert--ok">{{ notice }}</p>

    <section class="grid">
      <AppCard
        title="锁屏提醒冒烟测试"
        description="验证全屏置顶、遮罩窗口、音频自动播放三项核心能力。"
      >
        <div class="field">
          <label for="duration">提醒时长</label>
          <select id="duration" v-model.number="duration" :disabled="!desktop || busy === 'lock'">
            <option :value="15">15 秒</option>
            <option :value="30">30 秒</option>
            <option :value="60">60 秒</option>
          </select>
        </div>

        <div class="result-row">
          <span class="result-row__label">音频自动播放</span>
          <StatusPill :tone="audioTone" :label="audioLabel" />
        </div>
        <p v-if="audioResult" class="muted">
          {{ audioResult.detail }}（共播放 {{ audioResult.playedCount }} 次）
        </p>

        <template #footer>
          <AppButton
            :disabled="!desktop"
            :loading="busy === 'lock'"
            @click="runLockTest"
          >
            打开锁屏遮罩
          </AppButton>
          <AppButton variant="ghost" :disabled="!desktop" @click="refreshStatus">
            刷新状态
          </AppButton>
        </template>
      </AppCard>

      <AppCard
        title="全局键盘拦截"
        description="Windows 低层键盘钩子；锁屏遮罩打开时自动启用，音量键放行。"
      >
        <div class="result-row">
          <span class="result-row__label">钩子状态</span>
          <StatusPill :tone="blockingTone" :label="blockingLabel" />
        </div>
        <p class="muted">
          钩子已安装：{{ status.hookInstalled ? '是' : '否' }}。macOS / Linux 将在后续阶段补齐。
        </p>

        <template #footer>
          <AppButton
            :variant="status.blocking ? 'danger' : 'secondary'"
            :disabled="!desktop || !status.platformSupported"
            :loading="busy === 'keyboard'"
            @click="toggleKeyboard"
          >
            {{ status.blocking ? '停止拦截' : '开始拦截' }}
          </AppButton>
        </template>
      </AppCard>

      <AppCard
        title="系统集成"
        description="开机自启与系统通知。Windows 通知仅对已安装版本生效。"
      >
        <div class="result-row">
          <span class="result-row__label">开机自启</span>
          <StatusPill :tone="autoLaunch ? 'ok' : 'off'" :label="autoLaunch ? '已启用' : '未启用'" />
        </div>

        <template #footer>
          <AppButton
            variant="secondary"
            :disabled="!desktop"
            :loading="busy === 'autostart'"
            @click="toggleAutostart"
          >
            {{ autoLaunch ? '关闭开机自启' : '开启开机自启' }}
          </AppButton>
          <AppButton
            variant="secondary"
            :disabled="!desktop"
            :loading="busy === 'notification'"
            @click="testNotification"
          >
            发送测试通知
          </AppButton>
        </template>
      </AppCard>

      <AppCard
        title="自动更新"
        description="GitHub Release + tauri-plugin-updater，更新包带签名校验。"
      >
        <div class="result-row">
          <span class="result-row__label">当前版本</span>
          <StatusPill tone="ok" :label="`v${version}`" />
        </div>
        <p v-if="updateMessage" class="muted">{{ updateMessage }}</p>

        <template #footer>
          <AppButton
            variant="secondary"
            :disabled="!desktop || updateState === 'checking' || updateState === 'installing'"
            :loading="updateState === 'checking'"
            @click="checkForUpdates"
          >
            检查更新
          </AppButton>
          <AppButton
            v-if="availableUpdate"
            :loading="updateState === 'installing'"
            @click="installUpdate"
          >
            安装 v{{ availableUpdate.version }}
          </AppButton>
        </template>
      </AppCard>
    </section>

    <footer class="footer">
      <p>验证清单：托盘菜单 · 单实例 · 全屏置顶 · 键盘拦截 · 音频自动播放 · 自动更新</p>
      <p class="muted">
        Ctrl+Alt+Del、Win+L 属于系统安全序列，任何桌面框架都无法拦截；锁屏遮罩定位为习惯养成工具。
      </p>
    </footer>
  </main>
</template>

<style scoped>
.app-shell {
  width: min(960px, 100%);
  margin: 0 auto;
  padding: var(--hc-space-6) var(--hc-space-5) var(--hc-space-7);
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-5);
}

.hero {
  position: relative;
  overflow: hidden;
  padding: var(--hc-space-6);
  color: #fff;
  background: var(--hc-gradient-brand);
  border-radius: var(--hc-radius-xl);
  box-shadow: var(--hc-shadow-card);
}

.hero::after {
  content: '';
  position: absolute;
  inset: auto -60px -120px auto;
  width: 260px;
  height: 260px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
}

.hero__eyebrow {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.82;
}

.hero__title {
  margin-top: var(--hc-space-2);
  font-size: 34px;
  font-weight: 800;
  letter-spacing: 0.02em;
}

.hero__subtitle {
  margin-top: var(--hc-space-1);
  font-size: 14px;
  opacity: 0.9;
}

.hero__meta {
  display: flex;
  align-items: center;
  gap: var(--hc-space-3);
  margin-top: var(--hc-space-4);
}

.hero__version {
  font-size: 13px;
  opacity: 0.85;
}

.alert {
  padding: var(--hc-space-3) var(--hc-space-4);
  border-radius: var(--hc-radius-md);
  font-size: 13px;
  line-height: 1.6;
}

.alert--warn {
  color: #92400e;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
}

.alert--danger {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.24);
}

.alert--ok {
  color: #047857;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.24);
}

.alert code {
  padding: 1px 6px;
  border-radius: var(--hc-radius-sm);
  background: rgba(146, 64, 14, 0.12);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: var(--hc-space-4);
}

.field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
  font-size: 14px;
}

.field select {
  min-width: 120px;
  padding: 8px 12px;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-sm);
}

.result-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
}

.result-row__label {
  font-size: 14px;
  color: var(--hc-color-text-muted);
}

.muted {
  font-size: 12px;
  line-height: 1.6;
  color: var(--hc-color-text-muted);
}

.footer {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-1);
  padding-top: var(--hc-space-2);
  font-size: 12px;
  color: var(--hc-color-text-muted);
  text-align: center;
}
</style>
