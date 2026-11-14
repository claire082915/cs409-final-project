import { useEffect, useMemo, useState } from 'react'
import { Check, MapPin, PackageOpen, Search, SlidersHorizontal, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLocalTimeZone, today } from '@internationalized/date'
import AppShell from '../components/AppShell.jsx'
import DatePickerField from '../components/DatePickerField.jsx'
import DistanceSlider, { MAX_MILES } from '../components/DistanceSlider.jsx'
import SelectMenu from '../components/SelectMenu.jsx'
import { apiFetch } from '../lib/api.js'
import { useAuth } from '../auth/AuthContext.jsx'
import '../styles/pages/browse-borrow.css'

const MOCK_ITEMS = [
  {
    _id: 'mock-laptop',
    name: 'MacBook Pro',
    description: '13-inch laptop, great for coursework and projects.',
    category: 'Electronics',
    ownerName: 'Maya Chen',
    distanceMiles: 2.1,
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
    distanceMiles: 7.4,
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
    distanceMiles: 18.6,
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
    distanceMiles: 3.8,
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
    distanceMiles: 42.3,
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
    distanceMiles: 76.5,
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80',
    ],
  },
]
const CATEGORIES = ['All items', 'Electronics', 'Books', 'Outdoor', 'Sports', 'Home', 'Tools']

// Mock items are filtered here so the slider behaves the same in both modes
async function loadBrowseItems(source, miles) {
  if (source === 'mock') {
    const itemsInRange = MOCK_ITEMS.filter((item) => item.distanceMiles <= miles)
    return itemsInRange.sort((a, b) => a.distanceMiles - b.distanceMiles)
  }
  return apiFetch(`items/nearby?miles=${miles}`)
}

// Explains an empty list, from the most specific cause to the least
function BrowseEmptyState({ needsZipCode, nothingInRange, miles }) {
  if (needsZipCode) {
    return (
      <div className="browse-empty">
        <MapPin size={30} />
        <strong>Add your ZIP code to see items near you</strong>
        <span>Browse shows items from people within a distance you choose.</span>
        <Link to="/settings">Go to Settings</Link>
      </div>
    )
  }
  if (nothingInRange) {
    return (
      <div className="browse-empty">
        <PackageOpen size={30} />
        <strong>No items within {miles} miles</strong>
        <span>
          {miles < MAX_MILES
            ? 'Try a larger distance to see more.'
            : 'Nobody near you is lending anything yet.'}
        </span>
      </div>
    )
  }
  return (
    <div className="browse-empty">
      <PackageOpen size={30} />
      <strong>No items found</strong>
      <span>Try another search or category.</span>
    </div>
  )
}

export default function BrowseBorrowPage() {
  const { profile } = useAuth()
  const [source, setSource] = useState(() => localStorage.getItem('lendrBrowseSource') || 'mock')
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All items')
  const [miles, setMiles] = useState(10)
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // Nearby search needs a ZIP code, so skip the request until there is one
  const needsZipCode = source === 'backend' && !profile.zipCode

  useEffect(() => {
    localStorage.setItem('lendrBrowseSource', source)
    if (needsZipCode) {
      setItems([])
      setError('')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    loadBrowseItems(source, miles)
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
  }, [source, miles, needsZipCode])

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
    <AppShell withSearch={false}>
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
          <div className="browse-category">
            <SlidersHorizontal size={16} aria-hidden="true" />
            <SelectMenu
              aria-label="Filter by category"
              options={CATEGORIES}
              value={category}
              onChange={setCategory}
            />
          </div>
          {!needsZipCode && <DistanceSlider miles={miles} onChange={setMiles} />}
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
                    {item.distanceMiles} mi away
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
          <BrowseEmptyState
            needsZipCode={needsZipCode}
            nothingInRange={items.length === 0}
            miles={miles}
          />
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
                <DatePickerField
                  label="Return by"
                  className="browse-date-label"
                  name="dueDate"
                  minValue={today(getLocalTimeZone()).add({ days: 1 })}
                  isRequired
                />
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
