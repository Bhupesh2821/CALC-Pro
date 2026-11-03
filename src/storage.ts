export const STORAGE_EVENT = 'calc-pro-storage'
export const NOTICE_EVENT = 'calc-pro-notice'

export function notify(message: string) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(NOTICE_EVENT, { detail: message }))
}

export function compatible(value: unknown, initial: unknown): boolean {
  if (initial === null) return value === null || typeof value === 'number' && Number.isFinite(value)
  if (Array.isArray(initial)) return Array.isArray(value) && value.length <= 1000
  if (typeof initial === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (typeof initial === 'object') return !!value && typeof value === 'object' && !Array.isArray(value)
  return typeof value === typeof initial
}

export function readStored<T>(key: string, initial: T, valid?: (v: unknown) => v is T): T {
  try {
    const text = localStorage.getItem(key)
    if (!text || text.length > 2_000_000) return initial
    const value: unknown = JSON.parse(text)
    return (valid ? valid(value) : compatible(value, initial)) ? value as T : initial
  } catch { return initial }
}

export function writeStored(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true }
  catch { queueMicrotask(() => notify('Storage is unavailable or full. Changes will last for this session only.')); return false }
}
