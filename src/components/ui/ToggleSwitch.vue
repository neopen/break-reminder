<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

function onChange(event: Event): void {
  emit('update:modelValue', (event.target as HTMLInputElement).checked)
}
</script>

<template>
  <label class="toggle" :class="{ 'toggle--disabled': disabled }">
    <span v-if="label" class="toggle__label">{{ label }}</span>
    <span class="toggle__control">
      <input type="checkbox" :checked="modelValue" :disabled="disabled" @change="onChange" />
      <span class="toggle__track" aria-hidden="true">
        <span class="toggle__knob" />
      </span>
    </span>
  </label>
</template>

<style scoped>
.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--hc-space-3);
  font-size: 14px;
  cursor: pointer;
}

.toggle--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.toggle__control {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.toggle__control input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle__track {
  position: relative;
  width: 46px;
  height: 26px;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background var(--hc-duration-fast) var(--hc-ease);
}

.toggle__knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.25);
  transition: transform var(--hc-duration-fast) var(--hc-ease);
}

.toggle__control input:checked + .toggle__track {
  background: var(--hc-color-brand);
}

.toggle__control input:checked + .toggle__track .toggle__knob {
  transform: translateX(20px);
}

.toggle__control input:focus-visible + .toggle__track {
  outline: 2px solid var(--hc-color-brand);
  outline-offset: 2px;
}
</style>
