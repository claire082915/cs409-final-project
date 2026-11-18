import { useEffect, useMemo, useState } from 'react'
import { Check, MapPin, PackageOpen, Search, X } from 'lucide-react'
import { getLocalTimeZone, today } from '@internationalized/date'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import CategoryTag from '../components/CategoryTag.jsx'
import PendingLabel from '../components/PendingLabel.jsx'
import DatePickerField from '../components/DatePickerField.jsx'
import FilterMenu, { describeSelection } from '../components/FilterMenu.jsx'
import { CAMPUS_AREAS } from '../lib/campusAreas.js'
import { ITEM_CATEGORIES } from '../lib/itemCategories.js'
import { apiFetch } from '../lib/api.js'
import '../styles/pages/browse-borrow.css'

const MOCK_ITEMS = [
  {
    _id: 'mock-laptop',
    name: 'MacBook Pro',
    description: '13-inch laptop, great for coursework and projects.',
    category: 'Electronics',
    owner: {
      displayName: 'Maya Chen',
      username: 'maya-chen',
      photo: '',
      campusArea: 'Ikenberry Commons (Ike)',
    },
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
    owner: {
      displayName: 'Jordan Lee',
      username: 'jordan-lee',
      photo: '',
      campusArea: 'Campustown',
    },
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
    owner: {
      displayName: 'Sam Rivera',
      username: 'sam-rivera',
      photo: '',
      campusArea: 'Illinois Street (ISR)',
    },
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
    owner: {
      displayName: 'Avery Patel',
      username: 'avery-patel',
      photo: '',
      campusArea: 'Urbana',
    },
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
    owner: {
      displayName: 'Noah Brooks',
      username: 'noah-brooks',
      photo: '',
      campusArea: 'Pennsylvania Avenue (PAR)',
    },
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
    owner: {
      displayName: 'Taylor Kim',
      username: 'taylor-kim',
      photo: '',
      campusArea: '',
    },
    available: true,
    photos: [
      'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=900&q=80',
    ],
  },
]

async function loadBrowseItems(source) {
  if (source === 'mock') {
    return MOCK_ITEMS
  }
  return apiFetch('items/browse')
}

// Owner is null when they hid their profile
function OwnerDetails({ owner }) {
  return (
    <div className="browse-owner-details">
      <p className="browse-owner">
        {owner && (
          <Avatar
            photo={owner.photo}
            name={owner.displayName}
            username={owner.username}
            className="browse-owner-avatar"
          />
        )}
        <span>{owner?.displayName || 'Community member'}</span>
      </p>
      {owner?.campusArea && (
        <p className="browse-location">
          <MapPin size={12} aria-hidden="true" />
          {/* A span so a long area name can end in an ellipsis inside the flex row */}
          <span>{owner.campusArea}</span>
        </p>
      )}
    </div>
  )
}

// Tells an empty catalog apart from filters that match nothing
function BrowseEmptyState({ noItems, onClearFilters }) {
  if (noItems) {
    return (
      <div className="browse-empty">
        <PackageOpen size={30} />
        <strong>No items yet</strong>
        <span>Nobody is lending anything yet.</span>
      </div>
    )
  }
  return (
    <div className="browse-empty">
      <PackageOpen size={30} />
      <strong>No matching items</strong>
      <button type="button" className="browse-clear-filters" onClick={onClearFilters}>
        Clear filters
      </button>
    </div>
  )
}

export default function BrowseBorrowPage() {
  const [source, setSource] = useState(() => localStorage.getItem('lendrBrowseSource') || 'mock')
  const [items, setItems] = useState([])
  const [query, setQuery] = useState('')
  const [selectedCategories, setSelectedCategories] = useState(new Set())
  const [selectedAreas, setSelectedAreas] = useState(new Set())
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [requesting, setRequesting] = useState(false)
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

  // The date picker's calendar handles its own Escape first and stops it, so that closes before the popup
  useEffect(() => {
    if (!selectedItem) {
      return
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setSelectedItem(null)
      }
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [selectedItem])

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesQuery = `${item.name} ${item.description}`
          .toLowerCase()
          .includes(query.toLowerCase())
        const matchesCategory =
          selectedCategories.size === 0 || selectedCategories.has(item.category)
        // Owners with no area or a hidden profile only show under All areas
        const matchesArea = selectedAreas.size === 0 || selectedAreas.has(item.owner?.campusArea)
        return item.available !== false && matchesQuery && matchesCategory && matchesArea
      }),
    [items, query, selectedCategories, selectedAreas],
  )

  const requestBorrow = async (event) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const dueDate = String(form.get('dueDate') || '')
    if (source === 'mock') {
      setNotice(`Request sent to ${selectedItem.owner?.displayName || 'the owner'}!`)
      setSelectedItem(null)
      return
    }
    setRequesting(true)
    try {
      await apiFetch('loans', { method: 'POST', body: { itemId: selectedItem._id, dueDate } })
      setNotice('Borrow request sent!')
      setSelectedItem(null)
    } catch (err) {
      setError(err.message)
    }
    setRequesting(false)
  }

  return (
    <AppShell withSearch={false}>
      <main className="browse-page">
        <header className="browse-heading page-heading">
          <div>
            <h1>Browse Items</h1>
            <p>Borrow from people on campus.</p>
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
              placeholder="Search items"
              aria-label="Search items"
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
            <FilterMenu
              options={CAMPUS_AREAS}
              selected={selectedAreas}
              onChange={setSelectedAreas}
              allLabel="All areas"
              pluralLabel="areas"
              label="area"
            />
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
          <span>
            {selectedCategories.size === 0
              ? 'Available now'
              : describeSelection(selectedCategories, 'All categories', 'categories')}
          </span>
          <small>
            {visibleItems.length} {visibleItems.length === 1 ? 'item' : 'items'}
          </small>
        </div>
        {loading ? (
          <AppLoader inline label="Loading items…" />
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
                  <CategoryTag category={item.category} />
                </div>
                <div className="browse-card-body">
                  <h2 className="browse-card-title">
                    {/* Its click area covers the whole card, so the card opens the request */}
                    <button
                      className="browse-card-open"
                      type="button"
                      title={item.name}
                      aria-haspopup="dialog"
                      onClick={() => {
                        setError('')
                        setSelectedItem(item)
                      }}
                    >
                      {item.name}
                    </button>
                  </h2>
                  <OwnerDetails owner={item.owner} />
                </div>
              </article>
            ))}
          </section>
        ) : (
          <BrowseEmptyState
            noItems={items.length === 0}
            onClearFilters={() => {
              setQuery('')
              setSelectedCategories(new Set())
              setSelectedAreas(new Set())
            }}
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
                  <OwnerDetails owner={selectedItem.owner} />
                  {selectedItem.category && (
                    <p className="borrow-item-tag">{selectedItem.category}</p>
                  )}
                  {selectedItem.description && (
                    <p className="borrow-item-description">{selectedItem.description}</p>
                  )}
                </div>
              </div>
              <form className="borrow-request-form" onSubmit={requestBorrow}>
                <DatePickerField
                  label={
                    <>
                      Return by{' '}
                      {/* Hidden from screen readers since isRequired already announces it */}
                      <span className="borrow-required" aria-hidden="true">
                        *
                      </span>
                    </>
                  }
                  className="browse-date-label"
                  name="dueDate"
                  minValue={today(getLocalTimeZone()).add({ days: 1 })}
                  isRequired
                />
                <label className="borrow-message-label" htmlFor="borrow-message">
                  Message <span className="borrow-field-hint">(optional)</span>
                </label>
                <textarea id="borrow-message" name="message" rows="4" />
                <div className="browse-modal-actions">
                  <button
                    className="browse-cancel-button"
                    type="button"
                    onClick={() => setSelectedItem(null)}
                  >
                    Cancel
                  </button>
                  <button className="browse-request-button" type="submit" disabled={requesting}>
                    <PendingLabel pending={requesting} pendingText="Sending…">
                      Send request
                    </PendingLabel>
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
