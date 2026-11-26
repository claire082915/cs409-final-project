import { useSyncExternalStore } from 'react'
import { apiFetch } from './api.js'

let pendingActions = { requests: 0, loans: 0 }
const listeners = new Set()

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePendingActions() {
  return useSyncExternalStore(subscribe, () => pendingActions)
}

// A failed check keeps the last dots
export async function refreshPendingActions() {
  try {
    pendingActions = await apiFetch('loans/pending')
  } catch {
    return
  }
  for (const listener of listeners) {
    listener()
  }
}
