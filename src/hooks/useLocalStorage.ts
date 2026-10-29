import { useEffect, useState } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T) {
  const legacyKey = key.startsWith('lionpost-') ? key.replace(/^lionpost-/, 'alphapost-') : ''
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(key) ?? (legacyKey ? localStorage.getItem(legacyKey) : null)
      return saved ? (JSON.parse(saved) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      // Move existing browser work to the LionPost key without discarding it.
      if (legacyKey) localStorage.removeItem(legacyKey)
    } catch {
      // The app remains usable when browser storage is unavailable.
    }
  }, [key, legacyKey, value])

  return [value, setValue] as const
}

export function makeId(prefix = 'item') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}
