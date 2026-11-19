import { useEffect, useMemo, useState } from 'react'
import { Check, PackageOpen, Search, X } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import BorrowItemDialog from '../components/BorrowItemDialog.jsx'
import CategoryTag from '../components/CategoryTag.jsx'
import OwnerDetails from '../components/OwnerDetails.jsx'
import FilterMenu, { describeSelection } from '../components/FilterMenu.jsx'
import { CAMPUS_AREAS } from '../lib/campusAreas.js'
import { ITEM_CATEGORIES } from '../lib/itemCategories.js'
import { apiFetch } from '../lib/api.js'
import { MOCK_ITEMS } from '../lib/mockItems.js'
import '../styles/pages/browse-borrow.css'

async function loadBrowseItems(source) {
  if (source === 'mock') {
    return MOCK_ITEMS
  }
  return apiFetch('items/browse')
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
          <BorrowItemDialog
            item={selectedItem}
            isMock={source === 'mock'}
            onClose={() => setSelectedItem(null)}
            onSent={(message) => {
              setNotice(message)
              setSelectedItem(null)
            }}
          />
        )}
      </main>
    </AppShell>
  )
}
