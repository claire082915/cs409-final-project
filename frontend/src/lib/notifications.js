import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'lendrNotifications'
// Older ones drop off so the saved list stays short, picked by hand
const MAX_NOTIFICATIONS = 20

// Saved in the browser so they outlast a reload, cleared on log out
let notifications = JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []
const listeners = new Set()

function saveNotifications(next) {
  notifications = next
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
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

// Kind picks the icon, taskId ties an auto-populate result back to its review
export function addNotification({ kind, title, text, taskId }) {
  const notification = {
    id: crypto.randomUUID(),
    kind,
    title,
    text,
    taskId,
    createdAt: Date.now(),
    read: false,
  }
  saveNotifications([notification, ...notifications].slice(0, MAX_NOTIFICATIONS))
}

export function markAllRead() {
  if (notifications.every((notification) => notification.read)) {
    return
  }
  saveNotifications(notifications.map((notification) => ({ ...notification, read: true })))
}

export function dismissNotification(id) {
  saveNotifications(notifications.filter((notification) => notification.id !== id))
}

export function clearNotifications() {
  saveNotifications([])
}
