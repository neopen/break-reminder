<script setup lang="ts">
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="app-card">
    <header class="app-card__header">
      <div>
        <h2 class="app-card__title">{{ title }}</h2>
        <p v-if="description" class="app-card__description">{{ description }}</p>
      </div>
      <slot name="badge" />
    </header>

    <div class="app-card__body">
      <slot />
    </div>

    <footer v-if="$slots.footer" class="app-card__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.app-card {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-4);
  padding: var(--hc-space-5);
  background: var(--hc-color-surface);
  border: 1px solid var(--hc-color-border);
  border-radius: var(--hc-radius-lg);
  box-shadow: var(--hc-shadow-soft);
}

.app-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--hc-space-3);
}

.app-card__title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.app-card__description {
  margin-top: var(--hc-space-1);
  font-size: 13px;
  line-height: 1.6;
  color: var(--hc-color-text-muted);
}

.app-card__body {
  display: flex;
  flex-direction: column;
  gap: var(--hc-space-3);
  flex: 1;
}

.app-card__footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--hc-space-2);
}
</style>
