import { createElement, useSyncExternalStore } from 'react'
import { Sparkles } from 'lucide-react'
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
  // Index into DETECTION_MODELS, the panel names the model being tried
  attempt: 0,
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

// Same order as DETECTION_MODELS in backend/lib/detectItems.js, the backend picks the model by index
export const DETECTION_MODELS = [
  'Gemini 4 Hydrogen',
  'Gemini 4 Hydrogen',
  'Gemini 3.8 Flash',
  'Gemini 3.6 Flash',
]
// Same as NEXT_MODEL_STATUSES in backend/routes/items.js, overloaded and rate limited are both per model
const NEXT_MODEL_STATUSES = [429, 503]
// Long enough to read the status change before the next try, picked by hand
const RETRY_PAUSE_MS = 2000

async function detectItems(id, photo) {
  const photoUrl = await uploadPhoto(photo)
  for (const attempt of DETECTION_MODELS.keys()) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, RETRY_PAUSE_MS))
    }
    // Stop if a newer photo or a discard replaced this search, and delete the room photo the backend kept
    if (id !== searchId) {
      deletePhotos([photoUrl])
      return []
    }
    updateTask({ searchStep: 'finding', attempt })
    try {
      return await apiFetch('items/detect', { method: 'POST', body: { photoUrl, attempt } })
    } catch (err) {
      // Other errors like a bad photo would fail the same way on every model
      const isLastAttempt = attempt === DETECTION_MODELS.length - 1
      if (!NEXT_MODEL_STATUSES.includes(err.status) || isLastAttempt) {
        throw err
      }
    }
  }
}

// Leftover photos only cost storage, so a failure here isn't worth interrupting the user
function deletePhotos(photos) {
  apiFetch('items/detect/discard', { method: 'POST', body: { photos } }).catch((err) =>
    console.error('Discarding detected photos failed', err),
  )
}

// The backend deletes the crops of drafts nobody added
export function discardPhotos(drafts) {
  if (drafts.length === 0) {
    return
  }
  deletePhotos(drafts.map((draft) => draft.photos[0]))
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
    return { kind: 'error', title: "Couldn't check your photo", text: task.error }
  }
  const count = task.drafts.length
  if (count === 0) {
    return {
      kind: 'empty',
      title: 'No items found',
      text: 'Try a photo where each item is in full view.',
    }
  }
  return {
    kind: 'found',
    title: `Found ${count} ${count === 1 ? 'item' : 'items'} to review`,
    text: 'Pick the ones to add to your items.',
  }
}

const TOAST_BY_KIND = { error: toast.error, empty: toast, found: toast.success }
// Only found items have something to review, the others start over with a new photo
const ACTION_BY_KIND = {
  error: { label: 'Try again', onClick: openPicker },
  empty: { label: 'Try again', onClick: openPicker },
  found: { label: 'Review', onClick: openPanel },
}

function announceResult() {
  const message = resultMessage()
  addNotification({ ...message, taskId: task.id })
  // An open panel already shows the result
  if (task.isPanelOpen) {
    return
  }
  TOAST_BY_KIND[message.kind](message.title, {
    description: message.text,
    action: ACTION_BY_KIND[message.kind],
    // Auto-populate's icon like its notifications, the toast type colors it
    icon: createElement(Sparkles, { size: 18 }),
  })
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
