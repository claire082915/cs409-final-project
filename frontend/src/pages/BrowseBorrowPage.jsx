import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  MapPin,
  PackageOpen,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import { apiFetch } from '../lib/api.js'
import '../styles/pages/browse-borrow.css'

const MOCK_ITEMS = [
  {
    _id: 'mock-laptop',
    name: 'MacBook Pro',
    description: '13-inch laptop, great for coursework and projects.',
    category: 'Electronics',
    ownerName: 'Maya Chen',
    location: 'North Campus',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    _id: 'mock-tent',
    name: '2-person Camping Tent',
    description: 'Lightweight tent with rain fly. Easy to set up.',
    category: 'Outdoor',
    ownerName: 'Jordan Lee',
    location: 'West Residence',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    _id: 'mock-camera',
    name: 'Mirrorless Camera',
    description: 'A compact camera with a versatile 18–55mm lens.',
    category: 'Electronics',
    ownerName: 'Sam Rivera',
    location: 'Arts District',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    _id: 'mock-textbook',
    name: 'Computer Science Textbooks',
    description: 'A bundle of helpful books for introductory CS courses.',
    category: 'Books',
    ownerName: 'Avery Patel',
    location: 'North Campus',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    _id: 'mock-skateboard',
    name: 'Skateboard',
    description: 'Well-maintained complete board, suitable for beginners.',
    category: 'Sports',
    ownerName: 'Noah Brooks',
    location: 'South Quad',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1520045892732-304bc3ac5d8e?auto=format&fit=crop&w=900&q=80',
    ],
  },
  {
    _id: 'mock-earbuds',
    name: 'Wireless Earbuds',
    description: 'Noise-cancelling earbuds with charging case.',
    category: 'Electronics',
    ownerName: 'Taylor Kim',
    location: 'West Residence',
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80',
    ],
  },
]
const CATEGORIES = ['All items', 'Electronics', 'Books', 'Outdoor', 'Sports', 'Home', 'Tools']

async function loadBrowseItems(source) {
  if (source === 'mock') return MOCK_ITEMS
  // Public browse is not exposed by the current API yet. Keeping this request here
  // makes the source switch a one-line endpoint change when that route is ready.
  const data = await apiFetch('items/browse')
  return data.items || data
}

export default function BrowseBorrowPage() {
  const [source, setSource] = useState(() => localStorage.getItem('lendrBrowseSource') || 'mock')
  const [items, setItems] = useState(MOCK_ITEMS)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All items')
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    localStorage.setItem('lendrBrowseSource', source)
    let cancelled = false
    setLoading(true)
    setError('')
    loadBrowseItems(source)
      .then((data) => {
        if (!cancelled) setItems(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setItems([])
          setError(err.message)
        }
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
      items.filter((item) => {
        const matchesQuery =
          `${item.name} ${item.description || ''} ${item.ownerName || item.owner?.displayName || ''}`
            .toLowerCase()
            .includes(query.toLowerCase())
        const matchesCategory =
          category === 'All items' ||
          item.category === category ||
          item.categories?.includes(category)
        return item.available !== false && matchesQuery && matchesCategory
      }),
    [items, query, category],
  )

  const requestBorrow = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const dueDate = String(form.get('dueDate') || '')
    if (source === 'mock') {
      setNotice(`Request sent to ${selectedItem.ownerName || 'the owner'}!`)
      setSelectedItem(null)
      return
    }
    try {
      await apiFetch('loans', { method: 'POST', body: { itemId: selectedItem._id, dueDate } })
      setNotice('Borrow request sent!')
      setSelectedItem(null)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AppShell>
      <main className="browse-page">
        <header className="browse-heading">
          <div>
            <p className="browse-eyebrow">SHARE MORE, OWN LESS</p>
            <h1>Browse items</h1>
            <p>Find something useful from people in your community.</p>
          </div>
          <div className="browse-source" aria-label="Browse data source">
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
        </header>
        <div className="browse-toolbar">
          <label className="browse-search">
            <Search size={17} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search items or people…"
              aria-label="Search items or people"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </label>
          <label className="browse-category">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              aria-label="Filter by category"
            >
              {CATEGORIES.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        {error && (
          <p className="browse-message error" role="alert">
            {error}
          </p>
        )}
        {notice && (
          <p className="browse-message success" role="status">
            <Check size={16} />
            {notice}
            <button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">
              <X size={15} />
            </button>
          </p>
        )}
        <div className="browse-results-label">
          <span>{category === 'All items' ? 'Available near you' : category}</span>
          <small>
            {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
          </small>
        </div>
        {loading ? (
          <div className="browse-empty">Loading items…</div>
        ) : visibleItems.length ? (
          <section className="browse-grid" aria-label="Available items">
            {visibleItems.map((item) => (
              <article className="browse-card" key={item._id}>
                <div className="browse-photo">
                  {item.photos?.[0] ? (
                    <img src={item.photos[0]} alt={item.name} loading="lazy" />
                  ) : (
                    <PackageOpen size={35} aria-hidden="true" />
                  )}
                  <span className="browse-category-tag">
                    {item.category || item.categories?.[0] || 'Shared item'}
                  </span>
                </div>
                <div className="browse-card-body">
                  <div className="browse-card-title">
                    <h2 title={item.name}>{item.name}</h2>
                  </div>
                  <p className="browse-owner">
                    Shared by{' '}
                    {item.ownerName ||
                      item.owner?.displayName ||
                      item.owner?.username ||
                      'Community member'}
                  </p>
                  <p className="browse-location">
                    <MapPin size={13} />
                    {item.location || 'On campus'}
                  </p>
                  <button
                    className="browse-request-button"
                    type="button"
                    onClick={() => {
                      setError('')
                      setSelectedItem(item)
                    }}
                  >
                    Request to borrow
                  </button>
                </div>
              </article>
            ))}
          </section>
        ) : (
          <div className="browse-empty">
            <PackageOpen size={30} />
            <strong>No items found</strong>
            <span>Try another search or category.</span>
          </div>
        )}
        {selectedItem && (
          <div
            className="browse-modal-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setSelectedItem(null)
            }}
          >
            <section
              className="browse-modal browse-request-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="borrow-modal-title"
            >
              <button
                className="browse-modal-close"
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
              <div className="borrow-item-summary">
                <div className="borrow-item-photo">
                  {selectedItem.photos?.[0] ? (
                    <img src={selectedItem.photos[0]} alt={selectedItem.name} />
                  ) : (
                    <PackageOpen size={35} aria-hidden="true" />
                  )}
                </div>
                <div className="borrow-item-details">
                  <h2 id="borrow-modal-title">{selectedItem.name}</h2>
                  <p className="borrow-item-owner">
                    Listed by{' '}
                    {selectedItem.ownerName ||
                      selectedItem.owner?.displayName ||
                      selectedItem.owner?.username ||
                      'Community member'}
                  </p>
                  <div className="borrow-item-tags">
                    {[
                      selectedItem.category || selectedItem.categories?.[0],
                      selectedItem.subcategory,
                    ]
                      .filter(Boolean)
                      .map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                  </div>
                  <p className="borrow-item-description">
                    {selectedItem.description || 'A useful item shared with the community.'}
                  </p>
                </div>
              </div>
              <form className="borrow-request-form" onSubmit={requestBorrow}>
                <h3>Send a Borrow Request</h3>
                <label className="borrow-message-label" htmlFor="borrow-message">
                  Message <span>(optional)</span>
                </label>
                <textarea
                  id="borrow-message"
                  name="message"
                  placeholder="Hi! I’d love to borrow this. I’ll take good care of it!"
                  rows="4"
                />
                <label className="browse-date-label">
                  Return by{' '}
                  <span>
                    <CalendarDays size={15} />
                    <input
                      type="date"
                      name="dueDate"
                      min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                      required
                    />
                  </span>
                </label>
                <div className="browse-modal-actions">
                  <button
                    className="browse-cancel-button"
                    type="button"
                    onClick={() => setSelectedItem(null)}
                  >
                    Cancel
                  </button>
                  <button className="browse-request-button" type="submit">
                    Send request
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
