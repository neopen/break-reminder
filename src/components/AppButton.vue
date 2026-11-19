<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
    block?: boolean
    disabled?: boolean
    loading?: boolean
  }>(),
  {
    variant: 'primary',
    block: false,
    disabled: false,
    loading: false,
  },
)
</script>

<template>
  <button
    type="button"
    class="app-button"
    :class="[`app-button--${variant}`, { 'app-button--block': block }]"
    :disabled="disabled || loading"
  >
    <span v-if="loading" class="app-button__spinner" aria-hidden="true" />
    <slot />
  </button>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--hc-space-2);
  min-height: 40px;
  padding: 0 var(--hc-space-5);
  border: 1px solid transparent;
  border-radius: var(--hc-radius-pill);
  font-size: 14px;
  font-weight: 600;
  line-height: 1;
  transition:
    transform var(--hc-duration-fast) var(--hc-ease),
    box-shadow var(--hc-duration-fast) var(--hc-ease),
    background-color var(--hc-duration-fast) var(--hc-ease),
    opacity var(--hc-duration-fast) var(--hc-ease);
}

.app-button:not(:disabled):active {
  transform: translateY(1px);
}

.app-button:disabled {
  opacity: 0.55;
}

.app-button--primary {
  color: #fff;
  background: var(--hc-gradient-brand);
  box-shadow: 0 10px 22px -12px rgba(102, 126, 234, 0.9);
}

.app-button--secondary {
  color: var(--hc-color-brand-deep);
  background: var(--hc-color-surface);
  border-color: rgba(118, 75, 162, 0.2);
  box-shadow: var(--hc-shadow-soft);
}

.app-button--ghost {
  color: var(--hc-color-text-muted);
  background: transparent;
  border-color: transparent;
}

.app-button--danger {
  color: #fff;
  background: var(--hc-color-danger);
}

.app-button--block {
  width: 100%;
}

.app-button__spinner {
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: app-button-spin 0.8s linear infinite;
}

@keyframes app-button-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
