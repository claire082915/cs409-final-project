import { useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Pencil, Plus, PackageOpen, Search, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '../components/AppShell.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AppLoader from '../components/AppLoader.jsx'
import ItemNameButton from '../components/ItemNameButton.jsx'
import ItemTags from '../components/ItemTags.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import PendingLabel from '../components/PendingLabel.jsx'
import PhotoDropZone from '../components/PhotoDropZone.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { ITEM_CATEGORIES } from '../lib/itemCategories.js'
import { ITEM_CONDITIONS, NO_CONDITION, storedCondition } from '../lib/itemConditions.js'
import SelectMenu from '../components/SelectMenu.jsx'
import FilterMenu from '../components/FilterMenu.jsx'
import { uploadPhoto } from '../lib/uploadPhoto.js'
import { hasChanges } from '../lib/hasChanges.js'
import {
  hasStartedTask,
  onItemsAdded,
  openPanel,
  openPicker,
  useDetectionTask,
} from '../lib/detectionTask.js'
import { MOCK_INVENTORY } from '../lib/mockInventory.js'
import UnsavedChangesPrompt from '../components/UnsavedChangesPrompt.jsx'
import ViewSwitch from '../components/ViewSwitch.jsx'
import '../styles/pages/inventory.css'

// Matches the backend's default for items saved without one
const DEFAULT_CATEGORY = 'Other'

// Null while adding a new item
function formFromItem(item) {
  return {
    name: item?.name ?? '',
    category: item?.category ?? DEFAULT_CATEGORY,
    condition: item?.condition ?? NO_CONDITION,
    description: item?.description ?? '',
  }
}

export default function InventoryPage() {
  const { profile } = useAuth()
  const [source, setSource] = useState(() => localStorage.getItem('lendrInventorySource') || 'mock')
  const [items, setItems] = useState(MOCK_INVENTORY)
  const [tab, setTab] = useState('available')
  const [query, setQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isFormOpen, setIsFormOpen] = useState(false)
  // Null while adding a new item
  const [editingItem, setEditingItem] = useState(null)
  const [photoPreview, setPhotoPreview] = useState('')
  // A picked photo stays in the browser until the form is saved
  const [photoFile, setPhotoFile] = useState(null)
  const [form, setForm] = useState(() => formFromItem(null))
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const detectionTask = useDetectionTask()

  const openForm = (item) => {
    setEditingItem(item)
    setPhotoPreview(item?.photos[0] ?? '')
    setPhotoFile(null)
    setForm(formFromItem(item))
    setFormError('')
    setIsFormOpen(true)
  }

  // Read it into a preview, the upload waits until the form is saved
  const choosePhoto = (file) => {
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(String(reader.result))
    reader.readAsDataURL(file)
  }

  const hasUnsavedChanges =
    isFormOpen && (hasChanges(form, formFromItem(editingItem)) || photoFile !== null)

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }))

  // Asks first when closing would throw away changes, like leaving the Account page
  const requestClose = () => {
    if (hasUnsavedChanges) {
      setIsDiscardOpen(true)
      return
    }
    setIsFormOpen(false)
  }

  const discardChanges = () => {
    setIsDiscardOpen(false)
    setIsFormOpen(false)
  }

  const addItem = async (fields) => {
    if (source === 'mock') {
      const photos = photoPreview ? [photoPreview] : []
      return { _id: `mock-${Date.now()}`, ...fields, available: true, photos }
    }
    const photos = photoFile ? [await uploadPhoto(photoFile)] : []
    return apiFetch('items', { method: 'POST', body: { ...fields, photos } })
  }

  const editItem = async (fields) => {
    if (source === 'mock') {
      return { ...editingItem, ...fields, photos: photoPreview ? [photoPreview] : [] }
    }
    const photos = photoFile ? [await uploadPhoto(photoFile)] : editingItem.photos
    return apiFetch(`items/${editingItem._id}`, { method: 'PATCH', body: { ...fields, photos } })
  }

  // The photo review can be finished from any page, so its items arrive here as an event
  useEffect(
    () =>
      onItemsAdded((addedItems) => {
        setItems((current) => [...addedItems, ...current])
        setTab('available')
      }),
    [],
  )

  const saveItem = async (event) => {
    event.preventDefault()
    const fields = {
      name: form.name.trim(),
      category: form.category,
      condition: storedCondition(form.condition),
      description: form.description.trim(),
    }
    if (!fields.name) {
      setFormError('Enter an item name.')
      return
    }
    setSaving(true)
    try {
      if (editingItem) {
        const savedItem = await editItem(fields)
        setItems((current) =>
          current.map((item) => (item._id === savedItem._id ? savedItem : item)),
        )
        toast.success('Changes saved')
      } else {
        const newItem = await addItem(fields)
        setItems((current) => [newItem, ...current])
        setTab('available')
        toast.success(`${newItem.name} added`)
      }
      setIsFormOpen(false)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteItem = async () => {
    setDeleting(true)
    try {
      if (source === 'backend') {
        await apiFetch(`items/${deletingItem._id}`, { method: 'DELETE' })
      }
      setItems((current) => current.filter((item) => item._id !== deletingItem._id))
      setIsFormOpen(false)
      toast.success(`${deletingItem.name} deleted`)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
      setDeletingItem(null)
    }
  }

  useEffect(() => {
    localStorage.setItem('lendrInventorySource', source)
    if (source !== 'backend') {
      setItems(MOCK_INVENTORY)
      setError('')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    apiFetch(`users/${profile.username}`)
      .then((data) => {
        if (!cancelled) setItems(data.items)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [source, profile.username])

  // Escape mid-save would drop the form with the save still running, and confirm dialogs handle their own Escape
  useEffect(() => {
    if (!isFormOpen || saving || isDiscardOpen || deletingItem) {
      return
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        requestClose()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isFormOpen, saving, isDiscardOpen, deletingItem, hasUnsavedChanges])

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesTab = tab === 'available' ? item.available !== false : item.available === false
        const matchesQuery = `${item.name} ${item.description}`
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesCategory =
          selectedCategories.size === 0 || selectedCategories.has(item.category)
        return matchesTab && matchesQuery && matchesCategory
      }),
    [items, tab, query, selectedCategories],
  )
  const isFiltering = query || selectedCategories.size > 0
  const availableCount = items.filter((item) => item.available !== false).length
  const lentCount = items.length - availableCount

  return (
    <AppShell>
      <main className="inventory-page">
        <div className="page-heading">
          <div>
            <h1>My Items</h1>
            <p>Manage what you lend.</p>
          </div>
          <div className="inventory-heading-actions">
            {/* One photo at a time, a running search or unreviewed drafts reopen instead */}
            {hasStartedTask(detectionTask) ? (
              <button
                type="button"
                className="action-button action-button-teal-tint"
                onClick={openPanel}
              >
                {detectionTask.status === 'searching' ? (
                  <LoaderCircle size={17} className="task-spinner" aria-hidden="true" />
                ) : (
                  <Sparkles size={17} aria-hidden="true" />
                )}
                {detectionTask.status === 'searching' ? 'Finding items...' : 'Review items'}
              </button>
            ) : (
              <button
                type="button"
                className="action-button action-button-teal-tint"
                onClick={openPicker}
              >
                <Sparkles size={17} aria-hidden="true" /> Auto-populate
              </button>
            )}
            <button
              className="action-button action-button-orange-tint inventory-add-button"
              type="button"
              onClick={() => openForm(null)}
            >
              <Plus size={17} /> Add item
            </button>
          </div>
        </div>

        <div className="inventory-toolbar">
          <ViewSwitch
            label="Items to show"
            options={[
              {
                id: 'available',
                label: (
                  <>
                    Available<small>{availableCount}</small>
                  </>
                ),
              },
              {
                id: 'lent',
                label: (
                  <>
                    Lent<small>{lentCount}</small>
                  </>
                ),
              },
            ]}
            selected={tab}
            onChange={setTab}
          />
          <div className="inventory-source" aria-label="Inventory data source">
            <span>Data</span>
            <button
              type="button"
              className={source === 'mock' ? 'active' : ''}
              onClick={() => setSource('mock')}
            >
              Mock
            </button>
            <button
              type="button"
              className={source === 'backend' ? 'active' : ''}
              onClick={() => setSource('backend')}
            >
              Backend
            </button>
          </div>
        </div>
        <label className="inventory-search">
          <Search size={17} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search your items"
            aria-label="Search your items"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
              <X size={15} />
            </button>
          )}
          <FilterMenu
            options={ITEM_CATEGORIES}
            selected={selectedCategories}
            onChange={setSelectedCategories}
            allLabel="All categories"
            pluralLabel="categories"
            label="category"
          />
        </label>

        {error && (
          <p className="inventory-error" role="status">
            {error}
          </p>
        )}
        {loading ? (
          <AppLoader inline label="Loading your items…" />
        ) : visibleItems.length ? (
          <section className="inventory-grid" aria-label={`${tab} items`}>
            {visibleItems.map((item) => (
              <article className="inventory-card" key={item._id}>
                <div className="inventory-photo">
                  {item.photos?.[0] ? (
                    <img src={item.photos[0]} alt={item.name} />
                  ) : (
                    <PackageOpen size={34} />
                  )}
                </div>
                <div className="inventory-card-copy">
                  <strong>
                    {/* Its click area covers the whole card, like on Browse */}
                    <ItemNameButton
                      name={item.name}
                      className="inventory-card-open"
                      onClick={() => openForm(item)}
                    />
                  </strong>
                  <ItemTags category={item.category} condition={item.condition} />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <EmptyState
            icon={PackageOpen}
            title={isFiltering ? 'No matching items' : `No ${tab} items`}
          >
            {!isFiltering && <span>Your items will appear here.</span>}
          </EmptyState>
        )}
        {isFormOpen && (
          <div
            className="item-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) requestClose()
            }}
          >
            <section
              className="item-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="item-modal-title"
            >
              <div className="item-modal-heading">
                <div>
                  <h2 id="item-modal-title">{editingItem ? 'Edit item' : 'Add item'}</h2>
                </div>
                <button
                  className="close-button"
                  type="button"
                  aria-label="Close"
                  onClick={requestClose}
                >
                  <X size={19} />
                </button>
              </div>
              <form className="item-form" onSubmit={saveItem}>
                <div className="item-form-top">
                  <PhotoDropZone className="item-photo-upload" onPhoto={choosePhoto}>
                    {photoPreview && (
                      <>
                        <img src={photoPreview} alt="Change photo" />
                        <span className="item-photo-change">
                          <Pencil size={14} aria-hidden="true" />
                        </span>
                      </>
                    )}
                  </PhotoDropZone>
                  <div className="item-form-main">
                    <label className="item-form-field">
                      <span>
                        Item name{' '}
                        <span className="item-required" aria-hidden="true">
                          *
                        </span>
                      </span>
                      <input
                        name="name"
                        value={form.name}
                        onChange={(event) => setField('name', event.target.value)}
                        required
                        maxLength="80"
                      />
                    </label>
                    <div className="item-form-field">
                      <span id="item-category-label">Category</span>
                      <SelectMenu
                        className="item-select"
                        aria-labelledby="item-category-label"
                        options={ITEM_CATEGORIES}
                        value={form.category}
                        onChange={(category) => setField('category', category)}
                      />
                    </div>
                    <div className="item-form-field">
                      <span id="item-condition-label">
                        Condition{' '}
                        {/* The backend refuses a new condition while the item is on loan */}
                        {editingItem?.available === false && (
                          <span className="item-field-hint">(locked while lent)</span>
                        )}
                      </span>
                      <SelectMenu
                        className="item-select"
                        aria-labelledby="item-condition-label"
                        options={[...ITEM_CONDITIONS, NO_CONDITION]}
                        value={form.condition}
                        onChange={(condition) => setField('condition', condition)}
                        isDisabled={editingItem?.available === false}
                      />
                    </div>
                  </div>
                </div>
                <label className="item-form-field">
                  <span>
                    Notes <span className="item-field-hint">(optional)</span>
                  </span>
                  <textarea
                    name="notes"
                    value={form.description}
                    onChange={(event) => setField('description', event.target.value)}
                    rows="3"
                    placeholder="Pickup details..."
                    maxLength="500"
                  />
                </label>
                {formError && (
                  <p className="item-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="item-form-actions">
                  {/* The backend refuses to delete an item while it's on loan */}
                  {editingItem && editingItem.available !== false && (
                    <button
                      type="button"
                      className="action-button action-button-orange-tint item-delete-button"
                      disabled={saving}
                      onClick={() => setDeletingItem(editingItem)}
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    className="action-button action-button-neutral"
                    disabled={saving}
                    onClick={requestClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="action-button action-button-teal"
                    disabled={saving}
                  >
                    <PendingLabel pending={saving} pendingText="Saving…">
                      {editingItem ? 'Save' : 'Add item'}
                    </PendingLabel>
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
        <UnsavedChangesPrompt when={hasUnsavedChanges} />
        <ConfirmDialog
          isOpen={isDiscardOpen}
          title="Leave without saving?"
          text="Your changes will be lost."
          cancelLabel="Keep editing"
          confirmLabel="Leave"
          onCancel={() => setIsDiscardOpen(false)}
          onConfirm={discardChanges}
        />
        <ConfirmDialog
          isOpen={Boolean(deletingItem)}
          isPending={deleting}
          title={`Delete ${deletingItem?.name}?`}
          text="Pending requests for it will be declined."
          cancelLabel="Cancel"
          confirmLabel={
            <PendingLabel pending={deleting} pendingText="Deleting…">
              Delete
            </PendingLabel>
          }
          onCancel={() => setDeletingItem(null)}
          onConfirm={deleteItem}
        />
      </main>
    </AppShell>
  )
}
