import { useEffect, useMemo, useState } from 'react'
import { ImagePlus, MoreHorizontal, Plus, PackageOpen, X } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import '../styles/pages/inventory.css'

const API_BASE = (
  import.meta.env.VITE_API_BASE_URL || 'https://lendr-api.onrender.com/api'
).replace(/\/$/, '')
const MOCK_ITEMS = [
  {
    _id: 'mock-laptop',
    name: 'MacBook Pro',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-tent',
    name: 'Tent',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-textbook',
    name: 'Textbook (CS)',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-camera',
    name: 'Camera',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-skateboard',
    name: 'Skateboard',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-earbuds',
    name: 'AirPods',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-projector',
    name: 'Projector',
    available: false,
    photos: [
      'https://images.unsplash.com/photo-1535016120720-40c646be5580?auto=format&fit=crop&w=700&q=80',
    ],
  },
  {
    _id: 'mock-drill',
    name: 'Power drill',
    available: false,
    photos: [
      'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=700&q=80',
    ],
  },
]
const CATEGORIES = ['Electronics', 'Books', 'Outdoor', 'Home', 'Sports', 'Tools', 'Other']

export default function InventoryPage() {
  const [source, setSource] = useState(() => localStorage.getItem('lendrInventorySource') || 'mock')
  const [items, setItems] = useState(MOCK_ITEMS)
  const [tab, setTab] = useState('available')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [formError, setFormError] = useState('')

  const addMockItem = (event) => {
    event.preventDefault()
    if (source === 'backend') {
      setFormError(
        'The backend does not support item photos, daily prices, or categories yet. Switch to Mock mode to preview this item.',
      )
      return
    }
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const dailyPrice = Number(form.get('dailyPrice'))
    if (!name || !Number.isFinite(dailyPrice) || dailyPrice < 0) {
      setFormError('Enter an item name and a valid daily price.')
      return
    }
    setItems((current) => [
      {
        _id: `mock-${Date.now()}`,
        name,
        dailyPrice,
        categories: form.getAll('categories'),
        description: String(form.get('notes') || '').trim(),
        available: true,
        photos: photoPreview ? [photoPreview] : [],
      },
      ...current,
    ])
    setTab('available')
    setIsAddOpen(false)
    setPhotoPreview('')
    setFormError('')
  }

  useEffect(() => {
    localStorage.setItem('lendrInventorySource', source)
    if (source !== 'backend') {
      setItems(MOCK_ITEMS)
      setError('')
      return
    }

    const token = sessionStorage.getItem('lendrIdToken')
    const username = localStorage.getItem('lendrUsername')
    if (!token || !username) {
      setItems([])
      setError('Backend mode needs a signed-in session and a Lendr username.')
      return
    }

    let cancelled = false
    setLoading(true)
    setError('')
    fetch(`${API_BASE}/users/${encodeURIComponent(username)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        const body = await response.json()
        if (!response.ok) throw new Error(body.message || 'Could not load your items.')
        return body.data.items || []
      })
      .then((data) => {
        if (!cancelled) setItems(data)
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
  }, [source])

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
        <div className="inventory-heading">
          <div>
            <p className="inventory-eyebrow">YOUR COLLECTION</p>
            <h1>My Items</h1>
            <p>Manage the things you’re happy to lend to your community.</p>
          </div>
          <button
            className="inventory-add-button"
            type="button"
            onClick={() => {
              setFormError('')
              setIsAddOpen(true)
            }}
          >
            <Plus size={17} /> Add Item
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
          <div className="inventory-empty">Loading your items…</div>
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
                  <button type="button" aria-label={`More options for ${item.name}`}>
                    <MoreHorizontal size={19} />
                  </button>
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
        {isAddOpen && (
          <div
            className="item-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setIsAddOpen(false)
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
                  <p className="inventory-eyebrow">GROW YOUR COLLECTION</p>
                  <h2 id="item-modal-title">Add an item</h2>
                </div>
                <button
                  className="item-modal-close"
                  type="button"
                  aria-label="Close"
                  onClick={() => setIsAddOpen(false)}
                >
                  <X size={19} />
                </button>
              </div>
              <p className="item-modal-intro">
                Share a few details so your neighbors know what they can borrow.
              </p>
              <form className="item-form" onSubmit={addMockItem}>
                <label className="item-photo-upload">
                  {photoPreview ? (
                    <img src={photoPreview} alt="Selected item preview" />
                  ) : (
                    <>
                      <ImagePlus size={25} />
                      <strong>Add a photo</strong>
                      <span>Choose an image from your device</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (!file) return setPhotoPreview('')
                      const reader = new FileReader()
                      reader.onload = () => setPhotoPreview(String(reader.result || ''))
                      reader.readAsDataURL(file)
                    }}
                  />
                </label>
                <label className="item-form-field">
                  Item name
                  <input name="name" placeholder="e.g. Cordless drill" required maxLength="80" />
                </label>
                <label className="item-form-field">
                  Lending price per day
                  <div className="item-price-input">
                    <span>$</span>
                    <input
                      name="dailyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      required
                    />
                    <small>per day</small>
                  </div>
                </label>
                <fieldset className="item-category-field">
                  <legend>Categories</legend>
                  <div className="item-category-options">
                    {CATEGORIES.map((category) => (
                      <label key={category}>
                        <input type="checkbox" name="categories" value={category} />
                        <span>{category}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="item-form-field">
                  Notes
                  <textarea
                    name="notes"
                    rows="3"
                    placeholder="Condition, pickup details, or anything else borrowers should know…"
                    maxLength="500"
                  />
                </label>
                {source === 'backend' && (
                  <p className="item-form-note">
                    Backend support for price, categories, and image uploads is not available yet.
                    Switch to Mock mode to add this item to the preview.
                  </p>
                )}
                {formError && (
                  <p className="item-form-error" role="alert">
                    {formError}
                  </p>
                )}
                <div className="item-form-actions">
                  <button
                    type="button"
                    className="item-cancel-button"
                    onClick={() => setIsAddOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="inventory-add-button">
                    Add Item
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </main>
    </AppShell>
  )
}
