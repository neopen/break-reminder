import { ref } from 'vue'

export type ToastTone = 'ok' | 'warn' | 'danger' | 'info'

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

const items = ref<ToastItem[]>([])
let sequence = 0

function remove(id: number): void {
  items.value = items.value.filter((item) => item.id !== id)
}

function show(message: string, tone: ToastTone = 'ok', duration = 3200): void {
  const id = ++sequence
  items.value.push({ id, tone, message })
  window.setTimeout(() => remove(id), duration)
}

export function useToast() {
  return { items, show, remove }
}
