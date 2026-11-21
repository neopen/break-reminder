<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    open: boolean
    title: string
    subtitle?: string
    icon?: string
    wide?: boolean
  }>(),
  {
    subtitle: '',
    icon: '',
    wide: false,
  },
)

const emit = defineEmits<{ (event: 'update:open', value: boolean): void }>()

const panelRef = ref<HTMLElement | null>(null)

function close(): void {
  emit('update:open', false)
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
    panelRef.value?.focus()
  },
)

onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="glass">
      <div v-if="open" class="glass-backdrop" @click.self="close">
        <div
          ref="panelRef"
          class="glass"
          :class="{ 'glass--wide': wide }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
          tabindex="-1"
        >
          <header class="glass__head">
            <span v-if="icon" class="glass__icon" aria-hidden="true">{{ icon }}</span>
            <div class="glass__heading">
              <h2 class="glass__title">{{ title }}</h2>
              <p v-if="subtitle" class="glass__subtitle">{{ subtitle }}</p>
            </div>
            <button type="button" class="glass__close" aria-label="关闭" @click="close">✕</button>
          </header>

          <div class="glass__body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="glass__foot">
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.glass-backdrop {
  position: fixed;
  inset: 0;
  z-index: 20000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--hc-space-4);
  background: rgba(5, 8, 20, 0.68);
  backdrop-filter: blur(8px);
}

.glass {
  display: flex;
  flex-direction: column;
  width: min(440px, 100%);
  max-height: min(88vh, 700px);
  padding: var(--hc-space-5);
  color: #eef2ff;
  background: linear-gradient(160deg, rgba(29, 34, 64, 0.98), rgba(13, 16, 32, 0.98));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 26px;
  box-shadow: 0 40px 90px -30px rgba(0, 0, 0, 0.9);
  outline: none;

  color-scheme: dark;
  --hc-color-text: #eef2ff;
  --hc-color-text-muted: #c7cdf0;
  --hc-color-text-faint: #8d94bd;
  --hc-color-surface: #171b32;
  --hc-color-surface-soft: rgba(255, 255, 255, 0.06);
  --hc-color-border: rgba(255, 255, 255, 0.12);
  --hc-color-brand-deep: #c4b5fd;
}

.glass--wide {
  width: min(520px, 100%);
}

.glass__head {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: var(--hc-space-3);
}

.glass__icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  font-size: 19px;
  background: linear-gradient(135deg, rgba(124, 92, 255, 0.32), rgba(56, 189, 248, 0.18));
  border: 1px solid rgba(167, 139, 250, 0.3);
  border-radius: 14px;
}

.glass__heading {
  flex: 1;
  min-width: 0;
}

.glass__title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.glass__subtitle {
  margin-top: 2px;
  font-size: 12px;
  line-height: 1.5;
  color: #8d94bd;
}

.glass__close {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  font-size: 13px;
  color: #8d94bd;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
  transition:
    color var(--hc-duration-fast) var(--hc-ease),
    background var(--hc-duration-fast) var(--hc-ease);
}

.glass__close:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.glass__body {
  flex: 1;
  min-height: 0;
  margin-top: var(--hc-space-5);
  padding-right: 2px;
  overflow-y: auto;
}

.glass__foot {
  flex-shrink: 0;
  margin-top: var(--hc-space-4);
}

.glass-enter-active,
.glass-leave-active {
  transition: opacity var(--hc-duration-normal) var(--hc-ease);
}

.glass-enter-active .glass,
.glass-leave-active .glass {
  transition:
    transform var(--hc-duration-normal) var(--hc-ease),
    opacity var(--hc-duration-normal) var(--hc-ease);
}

.glass-enter-from,
.glass-leave-to {
  opacity: 0;
}

.glass-enter-from .glass,
.glass-leave-to .glass {
  opacity: 0;
  transform: translateY(16px) scale(0.97);
}
</style>
