import { ref } from 'vue'

export interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  tone?: 'warn' | 'danger'
}

interface ConfirmState extends ConfirmOptions {
  confirmText: string
  cancelText: string
  tone: 'warn' | 'danger'
}

const state = ref<ConfirmState | null>(null)
let resolver: ((confirmed: boolean) => void) | null = null

function confirm(options: ConfirmOptions): Promise<boolean> {
  state.value = {
    ...options,
    confirmText: options.confirmText ?? '确定',
    cancelText: options.cancelText ?? '取消',
    tone: options.tone ?? 'warn',
  }

  return new Promise<boolean>((resolve) => {
    resolver = resolve
  })
}

function resolve(confirmed: boolean): void {
  resolver?.(confirmed)
  resolver = null
  state.value = null
}

export function useConfirm() {
  return { state, confirm, resolve }
}
