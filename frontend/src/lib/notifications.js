import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { apiFetch } from './api.js'

let notifications = []
const listeners = new Set()

function setNotifications(next) {
  notifications = next
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useNotifications() {
  return useSyncExternalStore(subscribe, () => notifications)
}

// A failed check keeps the last list
export async function refreshNotifications() {
  try {
    setNotifications(await apiFetch('notifications'))
  } catch {
    return
  }
}

// The list changes right away, a failed save puts the saved list back
async function saveChange(path, method, next) {
  setNotifications(next)
  try {
    await apiFetch(path, { method })
  } catch (err) {
    toast.error(err.message)
    refreshNotifications()
  }
}

export function markAllRead() {
  if (notifications.every((notification) => notification.read)) {
    return
  }
  const next = notifications.map((notification) => ({ ...notification, read: true }))
  saveChange('notifications/read', 'PATCH', next)
}

export function dismissNotification(id) {
  const next = notifications.filter((notification) => notification._id !== id)
  saveChange(`notifications/${id}`, 'DELETE', next)
}

export function clearNotifications() {
  saveChange('notifications', 'DELETE', [])
}

export function forgetNotifications() {
  setNotifications([])
}
