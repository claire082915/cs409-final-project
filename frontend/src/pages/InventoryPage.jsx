import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, Plus, PackageOpen, X } from 'lucide-react'
import { toast } from 'sonner'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import CategoryTag from '../components/CategoryTag.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import ItemMenu from '../components/ItemMenu.jsx'
import PendingLabel from '../components/PendingLabel.jsx'
import { useAuth } from '../auth/AuthContext.jsx'
import { apiFetch } from '../lib/api.js'
import { ITEM_CATEGORIES } from '../lib/itemCategories.js'
import SelectMenu from '../components/SelectMenu.jsx'
import { uploadPhoto } from '../lib/uploadPhoto.js'
import { hasChanges } from '../lib/hasChanges.js'
import UnsavedChangesPrompt from '../components/UnsavedChangesPrompt.jsx'
import '../styles/pages/inventory.css'

const MOCK_ITEMS = [
  {
    _id: 'mock-laptop',
    name: 'MacBook Pro',
    category: 'Electronics',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-tent',
    name: 'Tent',
    category: 'Outdoor',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-textbook',
    name: 'Textbook (CS)',
    category: 'Books',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-camera',
    name: 'Camera',
    category: 'Electronics',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-skateboard',
    name: 'Skateboard',
    category: 'Sports',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-earbuds',
    name: 'AirPods',
    category: 'Electronics',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-projector',
    name: 'Projector',
    category: 'Electronics',
    available: false,
    photos: [
      'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-drill',
    name: 'Power drill',
    category: 'Tools',
    available: false,
    photos: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=80',
    ],
  },
]

// Matches the backend's default for items saved without one
const DEFAULT_CATEGORY = 'Other'

// Null while adding a new item
function formFromItem(item) {
  return {
    name: item?.name ?? '',
    category: item?.category ?? DEFAULT_CATEGORY,
    description: item?.description ?? '',
  }
}

export default function InventoryPage() {
  const { profile } = useAuth()
  const [source, setSource] = useState(() => localStorage.getItem('lendrInventorySource') || 'mock')
  const [items, setItems] = useState(MOCK_ITEMS)
  const [tab, setTab] = useState('available')
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

  const openForm = (item) => {
    setEditingItem(item)
    setPhotoPreview(item?.photos[0] ?? '')
    setPhotoFile(null)
    setForm(formFromItem(item))
    setFormError('')
    setIsFormOpen(true)
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

  const saveItem = async (event) => {
    event.preventDefault()
    const fields = {
      name: form.name.trim(),
      category: form.category,
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
      setItems(MOCK_ITEMS)
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

  // Escape while saving would leave the save running with the form gone, and the discard dialog handles its own Escape
  useEffect(() => {
    if (!isFormOpen || saving || isDiscardOpen) {
      return
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        requestClose()
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isFormOpen, saving, isDiscardOpen, hasUnsavedChanges])

  const visibleItems = useMemo(
    () =>
      items.filter((item) =>
        tab === 'available' ? item.available !== false : item.available === false,
      ),
    [items, tab],
  )
  const availableCount = items.filter((item) => item.available !== false).length
  const lentCount = items.length - availableCount

  return (
    <AppShell>
      <main className="inventory-page">
        <div className="inventory-heading page-heading">
          <div>
            <h1>My Items</h1>
            <p>Manage what you lend.</p>
          </div>
          <button className="inventory-add-button" type="button" onClick={() => openForm(null)}>
            <Plus size={17} /> Add item
          </button>
        </div>

        <div className="inventory-toolbar">
          <div className="inventory-tabs" role="tablist" aria-label="Filter items">
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'available'}
              className={tab === 'available' ? 'selected' : ''}
              onClick={() => setTab('available')}
            >
              Available <span>{availableCount}</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === 'lent'}
              className={tab === 'lent' ? 'selected' : ''}
              onClick={() => setTab('lent')}
            >
              Lent Out <span>{lentCount}</span>
            </button>
          </div>
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
                  <CategoryTag category={item.category} />
                  <ItemMenu
                    item={item}
                    onEdit={() => openForm(item)}
                    onDelete={() => setDeletingItem(item)}
                  />
                </div>
                <div className="inventory-card-copy">
                  <strong title={item.name}>{item.name}</strong>
                  <span className={item.available === false ? 'lent-status' : ''}>
                    {item.available === false ? 'Lent out' : 'Available'}
                  </span>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="inventory-empty">
            <PackageOpen size={28} />
            <strong>No {tab === 'available' ? 'available' : 'lent out'} items</strong>
            <span>Your items will appear here.</span>
          </div>
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
                  className="item-modal-close"
                  type="button"
                  aria-label="Close"
                  onClick={requestClose}
                >
                  <X size={19} />
                </button>
              </div>
              <form className="item-form" onSubmit={saveItem}>
                <div className="item-form-top">
                  <label className="item-photo-upload">
                    {photoPreview ? (
                      <>
                        <img src={photoPreview} alt="Selected item preview" />
                        <span className="item-photo-change">Change photo</span>
                      </>
                    ) : (
                      <>
                        <ImagePlus size={25} />
                        <strong>Add photo</strong>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        setPhotoFile(file ?? null)
                        if (!file) return setPhotoPreview('')
                        const reader = new FileReader()
                        reader.onload = () => setPhotoPreview(String(reader.result || ''))
                        reader.readAsDataURL(file)
                      }}
                    />
                  </label>
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
                    placeholder="Condition, pickup details..."
                    maxLength="500"
                  />
                </label>
                {formError && (
                  <p className="item-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="item-form-actions">
                  <button
                    type="button"
                    className="item-cancel-button"
                    disabled={saving}
                    onClick={requestClose}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="item-save-button" disabled={saving}>
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
