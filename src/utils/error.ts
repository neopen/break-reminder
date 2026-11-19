/** 把 Tauri / 原生抛出的任意错误统一成可展示的字符串 */
export function describeError(value: unknown): string {
  if (value instanceof Error) return value.message
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}
