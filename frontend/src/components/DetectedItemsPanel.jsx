import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components'
import { Check, Circle, ImageUp, LoaderCircle, SearchX, Sparkles, X } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog.jsx'
import DetectedItemCard from './DetectedItemCard.jsx'
import PendingLabel from './PendingLabel.jsx'
import PhotoDropZone from './PhotoDropZone.jsx'
import { apiFetch } from '../lib/api.js'
import { storedCondition } from '../lib/itemConditions.js'
import {
  clearTask,
  discardPhotos,
  discardTask,
  findItems,
  hidePanel,
  notifyItemsAdded,
  openPicker,
  updateDrafts,
  useDetectionTask,
} from '../lib/detectionTask.js'
// For the task-spinner the active step shares with the top bar button
import '../styles/components/detection-task-button.css'
import '../styles/components/detected-items-panel.css'

function addItem(draft) {
  const fields = {
    name: draft.name.trim(),
    description: draft.description.trim(),
    category: draft.category,
    condition: storedCondition(draft.condition),
    photos: draft.photos,
  }
  return apiFetch('items', { method: 'POST', body: fields })
}

// Adds every draft at once and sorts them into the ones that went through and the ones that didn't
async function addDrafts(drafts) {
  const results = await Promise.allSettled(drafts.map(addItem))
  const added = []
  const failed = []
  for (const [index, result] of results.entries()) {
    if (result.status === 'fulfilled') {
      added.push(result.value)
    } else {
      failed.push({ draft: drafts[index], reason: result.reason })
    }
  }
  return { added, failed }
}

// The first step, so the file browser doesn't open before the user knows what it's for
function PickState() {
  return (
    <div className="detected-pick">
      <p className="detected-pick-intro">
        We'll crop out each item and use Gemini to draft details for review.
      </p>
      <PhotoDropZone className="detected-drop" onPhoto={findItems} />
      <p className="detected-pick-hint">
        <strong>Tip:</strong> Use good lighting with items in full view. Up to 20 items generated
        per photo.
      </p>
    </div>
  )
}

// Only the steps the frontend can see happen, Gemini's cropping runs inside the finding step
// Finding never shows done, the review replaces the steps
const SEARCH_STEPS = [
  { id: 'uploading', label: 'Uploading photo', doneLabel: 'Photo uploaded' },
  { id: 'finding', label: 'Finding items with Gemini', doneLabel: 'Items found with Gemini' },
]

function stepState(index, currentIndex) {
  if (index < currentIndex) {
    return 'done'
  }
  return index === currentIndex ? 'active' : 'waiting'
}

function StepIcon({ state }) {
  if (state === 'done') {
    return <Check size={15} aria-hidden="true" />
  }
  if (state === 'active') {
    return <LoaderCircle size={15} className="task-spinner" aria-hidden="true" />
  }
  return <Circle size={15} aria-hidden="true" />
}

function SearchingState({ photoPreview, searchStep }) {
  const currentIndex = SEARCH_STEPS.findIndex((step) => step.id === searchStep)
  return (
    <div className="detected-searching" role="status">
      <div className="detected-room-photo">
        <img src={photoPreview} alt="Your photo" />
        <span className="detected-shimmer" aria-hidden="true" />
      </div>
      <ol className="detected-steps">
        {SEARCH_STEPS.map((step, index) => {
          const state = stepState(index, currentIndex)
          return (
            <li key={step.id} className={`detected-step ${state}`}>
              <StepIcon state={state} />
              {state === 'done' ? step.doneLabel : step.label}
            </li>
          )
        })}
      </ol>
      <span>
        This can take a minute.
        <br />
        You can close this and we'll notify you once it's done.
      </span>
    </div>
  )
}

// Covers both a failed search and a photo with nothing in it
function NoItemsState({ error }) {
  return (
    <div className="detected-empty">
      <SearchX size={28} aria-hidden="true" />
      <strong>{error ? "Couldn't check this photo" : 'No items found'}</strong>
      <span role={error ? 'alert' : undefined}>
        {error || 'Try a photo where each item is in full view.'}
      </span>
      {/* Back to the pick step rather than straight into the file browser */}
      <button type="button" className="detected-secondary-button" onClick={openPicker}>
        <ImageUp size={16} aria-hidden="true" /> Try another photo
      </button>
    </div>
  )
}

function ReviewHeading({ photoPreview, drafts }) {
  return (
    <div className="detected-review-heading">
      <img src={photoPreview} alt="Your photo" />
      <p>
        Found {drafts.length} {drafts.length === 1 ? 'item' : 'items'}. Uncheck any you don't want
        before adding them.
      </p>
    </div>
  )
}

// Slides in from the right over any page, closing only hides it while the search or drafts are kept
export default function DetectedItemsPanel() {
  const task = useDetectionTask()
  const [saving, setSaving] = useState(false)
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const { status, photoPreview, drafts, error } = task
  const selectedDrafts = drafts.filter((draft) => draft.selected)
  const unselectedDrafts = drafts.filter((draft) => !draft.selected)

  const updateDraft = (index, draft) =>
    updateDrafts(drafts.map((oldDraft, i) => (i === index ? draft : oldDraft)))

  const addKept = async (event) => {
    event.preventDefault()
    setSaving(true)
    // Clears the error from an earlier try
    updateDrafts(drafts)
    const { added, failed } = await addDrafts(selectedDrafts)
    setSaving(false)
    if (added.length > 0) {
      notifyItemsAdded(added)
      toast.success(`${added.length} ${added.length === 1 ? 'item' : 'items'} added`)
    }
    if (failed.length === 0) {
      discardPhotos(unselectedDrafts)
      clearTask()
      return
    }
    // Failed drafts stay for another try next to the unchecked ones
    const failedDrafts = failed.map((failure) => failure.draft)
    updateDrafts(
      [...failedDrafts, ...unselectedDrafts],
      `Couldn't add ${failed.length} of them: ${failed[0].reason.message}`,
    )
  }

  return (
    <>
      <ModalOverlay
        isOpen={task.isPanelOpen}
        isDismissable={!saving}
        isKeyboardDismissDisabled={saving}
        onOpenChange={(open) => !open && hidePanel()}
        className="detected-backdrop"
      >
        <Modal className="detected-panel-wrap">
          <Dialog className="detected-panel" aria-labelledby="detected-panel-title">
            <header className="detected-panel-header">
              <Heading slot="title" id="detected-panel-title">
                <Sparkles size={20} aria-hidden="true" /> Auto-populate from photo
              </Heading>
              <button
                type="button"
                className="detected-close"
                aria-label="Close"
                disabled={saving}
                onClick={hidePanel}
              >
                <X size={19} />
              </button>
            </header>
            {status === 'picking' && <PickState />}
            {status === 'searching' && (
              <SearchingState photoPreview={photoPreview} searchStep={task.searchStep} />
            )}
            {(status === 'failed' || (status === 'review' && drafts.length === 0)) && (
              <NoItemsState error={error} />
            )}
            {status === 'review' && drafts.length > 0 && (
              <form className="detected-review" onSubmit={addKept}>
                <div className="detected-review-list">
                  <ReviewHeading photoPreview={photoPreview} drafts={drafts} />
                  {drafts.map((draft, index) => (
                    <DetectedItemCard
                      key={draft.photos[0]}
                      draft={draft}
                      index={index}
                      onChange={(changed) => updateDraft(index, changed)}
                    />
                  ))}
                </div>
                <footer className="detected-panel-footer">
                  {error && (
                    <p className="item-form-error" role="alert">
                      {error}
                    </p>
                  )}
                  <div className="item-form-actions">
                    <button
                      type="button"
                      className="item-cancel-button"
                      disabled={saving}
                      onClick={() => setIsDiscardOpen(true)}
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="item-save-button"
                      disabled={saving || selectedDrafts.length === 0}
                    >
                      <PendingLabel pending={saving} pendingText="Adding...">
                        Add {selectedDrafts.length} {selectedDrafts.length === 1 ? 'item' : 'items'}
                      </PendingLabel>
                    </button>
                  </div>
                </footer>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
      <ConfirmDialog
        isOpen={isDiscardOpen}
        title="Discard these items?"
        text="None of the items found in this photo will be added."
        cancelLabel="Keep reviewing"
        confirmLabel="Discard"
        onCancel={() => setIsDiscardOpen(false)}
        onConfirm={() => {
          setIsDiscardOpen(false)
          discardTask()
        }}
      />
    </>
  )
}
