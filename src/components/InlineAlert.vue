<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'ok' | 'warn' | 'danger'
    message: string
  }>(),
  {
    tone: 'warn',
  },
)
</script>

<template>
  <p class="inline-alert" :class="`inline-alert--${tone}`">{{ message }}</p>
</template>

<style scoped>
.inline-alert {
  padding: var(--hc-space-2) var(--hc-space-3);
  border-radius: var(--hc-radius-sm);
  font-size: 12px;
  line-height: 1.6;
}

.inline-alert--warn {
  color: #92400e;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.28);
}

.inline-alert--danger {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.24);
}

.inline-alert--ok {
  color: #047857;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.24);
}
</style>
