<script setup lang="ts">
import { computed, ref } from 'vue'

import AppButton from '@/components/AppButton.vue'
import AppCard from '@/components/AppCard.vue'
import InlineAlert from '@/components/InlineAlert.vue'
import StatusPill from '@/components/StatusPill.vue'
import { useRuntimeStatus } from '@/composables/useRuntimeStatus'
import { setKeyboardBlocking } from '@/services/desktop'
import { describeError } from '@/utils/error'

const { desktop, status, refreshStatus } = useRuntimeStatus()

const busy = ref(false)
const error = ref('')

const label = computed(() => {
  if (!desktop) return '预览模式不可用'
  if (!status.value.platformSupported) return '当前平台暂未实现'
  return status.value.blocking ? '已拦截' : '未拦截'
})

const tone = computed<'ok' | 'warn' | 'off'>(() => {
  if (!desktop || !status.value.platformSupported) return 'off'
  return status.value.blocking ? 'ok' : 'warn'
})

async function toggleKeyboard(): Promise<void> {
  error.value = ''
  busy.value = true

  try {
    await setKeyboardBlocking(!status.value.blocking)
    await refreshStatus()
  } catch (cause) {
    error.value = `切换键盘拦截失败：${describeError(cause)}`
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <AppCard
    title="全局键盘拦截"
    description="Windows 低层键盘钩子；锁屏遮罩打开时自动启用，音量键放行。"
  >
    <div class="hc-result-row">
      <span class="hc-result-label">钩子状态</span>
      <StatusPill :tone="tone" :label="label" />
    </div>
    <p class="hc-muted">
      钩子已安装：{{ status.hookInstalled ? '是' : '否' }}。macOS / Linux 将在后续阶段补齐。
    </p>

    <InlineAlert v-if="error" tone="danger" :message="error" />

    <template #footer>
      <AppButton
        :variant="status.blocking ? 'danger' : 'secondary'"
        :disabled="!desktop || !status.platformSupported"
        :loading="busy"
        @click="toggleKeyboard"
      >
        {{ status.blocking ? '停止拦截' : '开始拦截' }}
      </AppButton>
    </template>
  </AppCard>
</template>
