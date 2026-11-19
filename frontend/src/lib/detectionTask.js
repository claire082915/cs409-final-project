import { useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import { apiFetch } from './api.js'
import { uploadPhoto } from './uploadPhoto.js'
import { addNotification } from './notifications.js'

const NO_TASK = {
  // Ties notifications to the search they came from
  id: 0,
  status: 'idle',
  // Which part of a search is running, the panel lists them as steps
  searchStep: 'uploading',
  photoPreview: '',
  drafts: [],
  error: '',
  isPanelOpen: false,
}

// Lives outside React so a search keeps going while the user moves between pages
let task = NO_TASK
const listeners = new Set()
const addedItemsListeners = new Set()
// Bumped on each new photo and on clear so a slow search for an old photo is dropped
let searchId = 0

function updateTask(changes) {
  task = { ...task, ...changes }
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useDetectionTask() {
  return useSyncExternalStore(subscribe, () => task)
}

// My Items listens so items added from the review show up even when it was opened from the top bar
export function onItemsAdded(listener) {
  addedItemsListeners.add(listener)
  return () => addedItemsListeners.delete(listener)
}

export function notifyItemsAdded(items) {
  for (const listener of addedItemsListeners) {
    listener(items)
  }
}

async function detectItems(id, photo) {
  const photoUrl = await uploadPhoto(photo)
  // Skip if a newer photo or a discard replaced this search
  if (id === searchId) {
    updateTask({ searchStep: 'finding' })
  }
  return apiFetch('items/detect', { method: 'POST', body: { photoUrl } })
}

// The backend deletes the crops of drafts nobody added
export function discardPhotos(drafts) {
  if (drafts.length === 0) {
    return
  }
  const photos = drafts.map((draft) => draft.photos[0])
  // Leftover crops only cost storage, so a failure here isn't worth interrupting the user
  apiFetch('items/detect/discard', { method: 'POST', body: { photos } }).catch((err) =>
    console.error('Discarding detected photos failed', err),
  )
}

export function openPanel() {
  updateTask({ isPanelOpen: true })
}

// The panel's first step, nothing runs until a photo is picked
export function openPicker() {
  updateTask({ ...NO_TASK, status: 'picking', isPanelOpen: true })
}

// Picking a photo hasn't started anything, so it counts the same as no task
export function hasStartedTask(task) {
  return task.status !== 'idle' && task.status !== 'picking'
}

// The same words go in the notification and, while the panel is hidden, a toast
function resultMessage() {
  if (task.status === 'failed') {
    return { kind: 'error', title: "Auto-populate couldn't check your photo", text: task.error }
  }
  const count = task.drafts.length
  if (count === 0) {
    return {
      kind: 'empty',
      title: 'Auto-populate found no items',
      text: 'Try a photo where each item is in full view.',
    }
  }
  return {
    kind: 'found',
    title: `Auto-populate found ${count} ${count === 1 ? 'item' : 'items'}`,
    text: 'Review them before adding them to your items.',
  }
}

const TOAST_BY_KIND = { error: toast.error, empty: toast, found: toast.success }

function announceResult() {
  const message = resultMessage()
  addNotification({ ...message, taskId: task.id })
  // An open panel already shows the result
  if (task.isPanelOpen) {
    return
  }
  const action = { label: 'Review', onClick: openPanel }
  TOAST_BY_KIND[message.kind](message.title, { description: message.text, action })
}

// Started from the file picker rather than an effect so StrictMode can't send a photo to Gemini twice
export async function findItems(photo) {
  const id = ++searchId
  URL.revokeObjectURL(task.photoPreview)
  updateTask({
    ...NO_TASK,
    id,
    status: 'searching',
    photoPreview: URL.createObjectURL(photo),
    isPanelOpen: true,
  })
  try {
    const found = await detectItems(id, photo)
    const drafts = found.map((item) => ({ ...item, selected: true }))
    // Delete the crops of a search that was replaced or discarded midway
    if (id !== searchId) {
      return discardPhotos(drafts)
    }
    updateTask({ status: 'review', drafts })
  } catch (err) {
    if (id !== searchId) {
      return
    }
    updateTask({ status: 'failed', error: err.message })
  }
  announceResult()
}

export function clearTask() {
  searchId++
  URL.revokeObjectURL(task.photoPreview)
  updateTask(NO_TASK)
}

// Hiding keeps a running search or drafts to review, the other steps have nothing to come back to
export function hidePanel() {
  const hasNothingToReview = task.status === 'review' && task.drafts.length === 0
  if (task.status === 'picking' || task.status === 'failed' || hasNothingToReview) {
    clearTask()
    return
  }
  updateTask({ isPanelOpen: false })
}

export function discardTask() {
  discardPhotos(task.drafts)
  clearTask()
}

export function updateDrafts(drafts, error = '') {
  updateTask({ drafts, error })
}
