import { useEffect, useState } from 'react'
import { notify, readStored, writeStored } from './storage'

/** useState that persists to localStorage (safe when storage is unavailable). */
export function useStored<T>(key: string, init: T, valid?: (v: unknown) => v is T) {
  const [v, setV] = useState<T>(() => readStored(key, init, valid))
  useEffect(() => { writeStored(key, v) }, [key, v])
  return [v, setV] as const
}

export async function copy(s: string): Promise<boolean> {
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
    await navigator.clipboard.writeText(s)
    notify('Copied to clipboard')
    return true
  } catch { notify('Clipboard unavailable. Select the value and use your browser’s Copy command.'); return false }
}
