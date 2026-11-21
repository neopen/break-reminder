<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

import { useToast } from '@/composables/useToast'
import { describeError } from '@/utils/error'
import { openExternalLink } from '@/utils/openExternal'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()

const { show } = useToast()

const FEEDBACK_EMAIL = 'helpenx@gmail.com'
const FEEDBACK_ISSUES_URL = 'https://github.com/neopen/break-reminder/issues'
const MAIL_SUBJECT = 'Breakly 功能反馈'

const mailtoUrl = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(MAIL_SUBJECT)}`

const firstOptionRef = ref<HTMLButtonElement | null>(null)

function close(): void {
  emit('update:open', false)
}

async function openOption(url: string): Promise<void> {
  try {
    await openExternalLink(url)
  } catch (cause) {
    // 打开失败时保留弹框，方便用户改用另一种反馈方式
    show(`打开链接失败：${describeError(cause)}`, 'danger')
    return
  }
  close()
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') close()
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      window.removeEventListener('keydown', onKeydown)
      return
    }

    window.addEventListener('keydown', onKeydown)
    await nextTick()
    firstOptionRef.value?.focus()
  },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="open" class="feedback-backdrop" @click.self="close">
    <div class="feedback" role="dialog" aria-modal="true" aria-labelledby="feedback-title">
      <button type="button" class="feedback__close" aria-label="关闭" @click="close">×</button>
      <h3 id="feedback-title" class="feedback__title">功能反馈</h3>
      <p class="feedback__hint">遇到问题或有新的想法？欢迎通过以下任一方式告诉我们。</p>

      <div class="feedback__options">
        <button
          ref="firstOptionRef"
          type="button"
          class="feedback__option"
          @click="openOption(mailtoUrl)"
        >
          <span class="feedback__icon" aria-hidden="true">✉️</span>
          <span class="feedback__body">
            <span class="feedback__option-title">发送邮件</span>
            <span class="feedback__option-desc">{{ FEEDBACK_EMAIL }}</span>
          </span>
        </button>

        <button type="button" class="feedback__option" @click="openOption(FEEDBACK_ISSUES_URL)">
          <span class="feedback__icon" aria-hidden="true">💬</span>
          <span class="feedback__body">
            <span class="feedback__option-title">在线反馈</span>
            <span class="feedback__option-desc">在 GitHub Issues 中提交问题</span>
          </span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feedback-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--hc-space-5);
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(6px);
}

.feedback {
  position: relative;
  width: min(380px, 100%);
  padding: var(--hc-space-6) var(--hc-space-5) var(--hc-space-5);
  background: #fff;
  border-radius: var(--hc-radius-lg);
  box-shadow: var(--hc-shadow-card);
  animation: feedback-in var(--hc-duration-normal) var(--hc-ease);
}

.feedback__close {
  position: absolute;
  top: var(--hc-space-3);
  right: var(--hc-space-3);
  width: 30px;
  height: 30px;
  font-size: 20px;
  line-height: 1;
  color: var(--hc-color-text-faint);
  background: none;
  border: none;
  border-radius: var(--hc-radius-pill);
  transition: color var(--hc-duration-fast) var(--hc-ease);
}

.feedback__close:hover {
  color: var(--hc-color-text);
}

.feedback__title {
  font-size: 20px;
  font-weight: 700;
  text-align: center;
}

.feedback__hint {
  margin-top: var(--hc-space-2);
  font-size: 13px;
  line-height: 1.7;
  color: var(--hc-color-text-muted);
  text-align: center;
}

.feedback__options {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-3);
  margin-top: var(--hc-space-5);
}

.feedback__option {
  display: flex;
  align-items: center;
  gap: var(--hc-space-3);
  width: 100%;
  padding: var(--hc-space-3) var(--hc-space-4);
  text-align: left;
  background: var(--hc-color-surface-soft);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-md);
  transition:
    border-color var(--hc-duration-fast) var(--hc-ease),
    background var(--hc-duration-fast) var(--hc-ease);
}

.feedback__option:hover,
.feedback__option:focus-visible {
  background: #fff;
  border-color: var(--hc-color-brand);
}

.feedback__option:focus-visible {
  outline: 2px solid var(--hc-color-brand);
  outline-offset: 1px;
}

.feedback__icon {
  flex: none;
  font-size: 22px;
  line-height: 1;
}

.feedback__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.feedback__option-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--hc-color-text);
}

.feedback__option-desc {
  overflow: hidden;
  font-size: 12px;
  color: var(--hc-color-text-muted);
  text-overflow: ellipsis;
  white-space: nowrap;
}

@keyframes feedback-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
