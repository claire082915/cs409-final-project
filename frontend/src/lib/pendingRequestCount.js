import { useEffect, useSyncExternalStore } from 'react'
import { apiFetch } from './api.js'
import { MOCK_RECEIVED } from './mockRequests.js'

// Shared so the sidebar badge matches the Borrow Requests page, null until loaded
let pendingRequestCount = null
const listeners = new Set()

export function setPendingRequestCount(count) {
  pendingRequestCount = count
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

// Uses the data source the Borrow Requests page last showed, the page keeps it current after that
async function loadPendingRequestCount() {
  const source = localStorage.getItem('lendrRequestSource') || 'mock'
  if (source === 'mock') {
    setPendingRequestCount(MOCK_RECEIVED.length)
    return
  }
  const requests = await apiFetch('loans/lent?status=requested')
  setPendingRequestCount(requests.length)
}

export function usePendingRequestCount() {
  const count = useSyncExternalStore(subscribe, () => pendingRequestCount)
  useEffect(() => {
    if (pendingRequestCount === null) {
      // The badge stays hidden if the count can't load
      loadPendingRequestCount().catch(() => {})
    }
  }, [])
  return count
}
