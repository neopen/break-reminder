<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'

const { state, resolve } = useConfirm()
</script>

<template>
  <div v-if="state" class="dialog-backdrop" @click.self="resolve(false)">
    <div class="dialog" role="dialog" aria-modal="true">
      <div class="dialog__icon" aria-hidden="true">⚠️</div>
      <h3 class="dialog__title">{{ state.title }}</h3>
      <p class="dialog__message">{{ state.message }}</p>
      <div class="dialog__actions">
        <button type="button" class="dialog__button" @click="resolve(false)">
          {{ state.cancelText }}
        </button>
        <button
          type="button"
          class="dialog__button"
          :class="state.tone === 'danger' ? 'dialog__button--danger' : 'dialog__button--warn'"
          @click="resolve(true)"
        >
          {{ state.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dialog-backdrop {
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

.dialog {
  width: min(360px, 100%);
  padding: var(--hc-space-6) var(--hc-space-5);
  text-align: center;
  color: #eef2ff;
  background: linear-gradient(160deg, rgba(29, 34, 64, 0.98), rgba(13, 16, 32, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--hc-radius-lg);
  box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.9);
  animation: dialog-in var(--hc-duration-normal) var(--hc-ease);
}

.dialog__icon {
  font-size: 42px;
  line-height: 1;
}

.dialog__title {
  margin-top: var(--hc-space-3);
  font-size: 20px;
  font-weight: 700;
}

.dialog__message {
  margin-top: var(--hc-space-2);
  font-size: 14px;
  line-height: 1.7;
  color: #a5adcf;
  white-space: pre-line;
}

.dialog__actions {
  display: flex;
  gap: var(--hc-space-3);
  margin-top: var(--hc-space-5);
}

.dialog__button {
  flex: 1;
  min-height: 42px;
  font-size: 15px;
  font-weight: 600;
  color: #c7cdf0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--hc-radius-md);
}

.dialog__button--warn {
  color: #fff;
  background: var(--hc-color-warning);
  border-color: transparent;
}

.dialog__button--danger {
  color: #fff;
  background: var(--hc-color-danger);
  border-color: transparent;
}

@keyframes dialog-in {
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
