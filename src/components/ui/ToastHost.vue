<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { items, remove } = useToast()
</script>

<template>
  <div class="toast-host">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="toast"
      :class="`toast--${item.tone}`"
      @click="remove(item.id)"
    >
      {{ item.message }}
    </button>
  </div>
</template>

<style scoped>
.toast-host {
  position: fixed;
  right: var(--hc-space-5);
  bottom: var(--hc-space-5);
  z-index: 21000;
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-2);
  max-width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}

.toast {
  padding: var(--hc-space-3) var(--hc-space-4);
  text-align: left;
  font-size: 13px;
  line-height: 1.6;
  color: #fff;
  background: #334155;
  border: none;
  border-radius: var(--hc-radius-md);
  box-shadow: var(--hc-shadow-card);
  pointer-events: auto;
  animation: toast-in var(--hc-duration-normal) var(--hc-ease);
}

.toast--ok {
  background: #059669;
}

.toast--warn {
  background: #d97706;
}

.toast--danger {
  background: #dc2626;
}

.toast--info {
  background: #4f46e5;
}

@keyframes toast-in {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
