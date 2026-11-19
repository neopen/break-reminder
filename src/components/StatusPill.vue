<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'ok' | 'warn' | 'off' | 'danger'
    label: string
  }>(),
  {
    tone: 'off',
  },
)
</script>

<template>
  <span class="status-pill" :class="`status-pill--${tone}`">
    <span class="status-pill__dot" aria-hidden="true" />
    {{ label }}
  </span>
</template>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: var(--hc-radius-pill);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.status-pill__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.status-pill--ok {
  color: #047857;
  background: rgba(16, 185, 129, 0.14);
}

.status-pill--warn {
  color: #b45309;
  background: rgba(245, 158, 11, 0.16);
}

.status-pill--off {
  color: var(--hc-color-text-muted);
  background: rgba(107, 114, 128, 0.12);
}

.status-pill--danger {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.14);
}
</style>
