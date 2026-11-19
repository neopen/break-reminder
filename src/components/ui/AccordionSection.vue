<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    defaultOpen?: boolean
  }>(),
  {
    defaultOpen: true,
  },
)

const open = ref(props.defaultOpen)
</script>

<template>
  <section class="accordion">
    <button type="button" class="accordion__header" @click="open = !open">
      <span>{{ title }}</span>
      <span class="accordion__icon" aria-hidden="true">{{ open ? '▼' : '▶' }}</span>
    </button>
    <div v-show="open" class="accordion__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.accordion {
  border-bottom: 1px solid var(--hc-color-border);
}

.accordion:last-child {
  border-bottom: none;
}

.accordion__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 13px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--hc-color-text);
  background: none;
  border: none;
  transition: color var(--hc-duration-fast) var(--hc-ease);
}

.accordion__header:hover {
  color: var(--hc-color-brand-deep);
}

.accordion__icon {
  font-size: 10px;
  color: var(--hc-color-text-muted);
}

.accordion__body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 16px;
}
</style>
