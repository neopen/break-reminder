<script setup lang="ts">
import { onMounted, ref } from 'vue'

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

import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import InlineAlert from '@/components/InlineAlert.vue'
import StatusPill from '@/components/StatusPill.vue'
import { isDesktopRuntime } from '@/services/desktop'
import { describeError } from '@/utils/error'

const desktop = isDesktopRuntime()
const autoLaunch = ref(false)
const busy = ref('')
const error = ref('')
const notice = ref('')

onMounted(async () => {
  if (!desktop) return
  try {
    autoLaunch.value = await isAutostartEnabled()
  } catch (cause) {
    console.warn('[system] 读取开机自启状态失败', cause)
  }
})

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
</script>

<template>
  <AppCard title="系统集成" description="开机自启与系统通知。Windows 通知仅对已安装版本生效。">
    <div class="hc-result-row">
      <span class="hc-result-label">开机自启</span>
      <StatusPill :tone="autoLaunch ? 'ok' : 'off'" :label="autoLaunch ? '已启用' : '未启用'" />
    </div>

    <InlineAlert v-if="error" tone="danger" :message="error" />
    <InlineAlert v-if="notice" tone="ok" :message="notice" />

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
</template>
