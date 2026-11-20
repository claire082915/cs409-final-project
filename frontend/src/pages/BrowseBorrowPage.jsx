import { useEffect, useRef, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { useDebounce } from 'use-debounce'
import { uniqBy } from 'lodash-es'
import { toast } from 'sonner'
import { Check, PackageOpen, X } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import SearchField from '../components/SearchField.jsx'
import SourceSwitch from '../components/SourceSwitch.jsx'
import ItemCard from '../components/ItemCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AppLoader from '../components/AppLoader.jsx'
import BorrowItemDialog from '../components/BorrowItemDialog.jsx'
import OwnerDetails from '../components/OwnerDetails.jsx'
import FilterMenu, { describeSelection } from '../components/FilterMenu.jsx'
import { CAMPUS_AREAS } from '../lib/campusAreas.js'
import { ITEM_CATEGORIES } from '../lib/itemCategories.js'
import { apiFetch } from '../lib/api.js'
import { MOCK_ITEMS } from '../lib/mockItems.js'
import '../styles/pages/browse-borrow.css'

// Same as the backend's page size so mock data scrolls the same way
const MOCK_PAGE_SIZE = 12
// Waits for a pause in typing before asking the backend
const SEARCH_DELAY_MS = 300

// Mirrors the backend's browse filter for mock data
function matchesFilters(item, { query, categories, areas }) {
  const matchesQuery = `${item.name} ${item.description}`
    .toLowerCase()
    .includes(query.toLowerCase())
  const matchesCategory = categories.size === 0 || categories.has(item.category)
  // Owners with no area or a hidden profile only show under All areas
  const matchesArea = areas.size === 0 || areas.has(item.owner?.campusArea)
  return item.available !== false && matchesQuery && matchesCategory && matchesArea
}

function browseParams({ query, categories, areas }, skip) {
  const params = new URLSearchParams({ skip })
  if (query) {
    params.set('q', query)
  }
  for (const category of categories) {
    params.append('category', category)
  }
  for (const area of areas) {
    params.append('area', area)
  }
  return params
}

async function loadBrowsePage(source, filters, skip) {
  if (source === 'mock') {
    const matches = MOCK_ITEMS.filter((item) => matchesFilters(item, filters))
    return { items: matches.slice(skip, skip + MOCK_PAGE_SIZE), total: matches.length }
  }
  return apiFetch(`items/browse?${browseParams(filters, skip)}`)
}

// Tells an empty catalog apart from filters that match nothing
function BrowseEmptyState({ noItems, onClearFilters }) {
  if (noItems) {
    return (
      <EmptyState icon={PackageOpen} title="No items yet">
        <span>Nobody is lending anything yet.</span>
      </EmptyState>
    )
  }
  return (
    <EmptyState icon={PackageOpen} title="No matching items">
      <button
        type="button"
        className="action-button action-button-neutral browse-clear-filters"
        onClick={onClearFilters}
      >
        Clear filters
      </button>
    </EmptyState>
  )
}

export default function BrowseBorrowPage() {
  const [source, setSource] = useState(() => localStorage.getItem('lendrBrowseSource') || 'mock')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  // Results fetched so far, counting repeats, so paging always moves forward
  const [nextSkip, setNextSkip] = useState(0)
  const [query, setQuery] = useState('')
  const [debouncedQuery] = useDebounce(query.trim(), SEARCH_DELAY_MS)
  const [selectedCategories, setSelectedCategories] = useState(new Set())
  const [selectedAreas, setSelectedAreas] = useState(new Set())
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // Bumped on each new search so a slow page from the old one is dropped
  const searchId = useRef(0)
  const { ref: endRef, inView: isEndInView } = useInView({ rootMargin: '400px' })

  const filters = { query: debouncedQuery, categories: selectedCategories, areas: selectedAreas }
  const hasFilters = debouncedQuery !== '' || selectedCategories.size > 0 || selectedAreas.size > 0

  useEffect(() => {
    localStorage.setItem('lendrBrowseSource', source)
    const id = ++searchId.current
    setLoading(true)
    setError('')
    loadBrowsePage(source, filters, 0)
      .then((page) => {
        if (id !== searchId.current) return
        setItems(page.items)
        setTotal(page.total)
        setNextSkip(page.items.length)
      })
      .catch((err) => {
        if (id !== searchId.current) return
        setItems([])
        setTotal(0)
        setNextSkip(0)
        setError(err.message)
      })
      .finally(() => {
        if (id === searchId.current) setLoading(false)
      })
  }, [source, debouncedQuery, selectedCategories, selectedAreas])

  // Runs again after each page while the end of the grid stays in view
  useEffect(() => {
    if (!isEndInView || loading || loadingMore || nextSkip >= total) {
      return
    }
    const id = searchId.current
    setLoadingMore(true)
    loadBrowsePage(source, filters, nextSkip)
      .then((page) => {
        if (id !== searchId.current) return
        // Skip paging can repeat an item when the list shifts mid-scroll, so keep the first copy
        setItems((current) => uniqBy([...current, ...page.items], '_id'))
        setNextSkip((skip) => skip + page.items.length)
        // The list might have grown or shrunk since the first page
        setTotal(page.total)
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingMore(false))
  }, [isEndInView, loading, loadingMore, nextSkip, total])

  return (
    <AppShell withSearch={false}>
      <main className="browse-page">
        <header className="page-heading">
          <div>
            <h1>Browse Items</h1>
            <p>Borrow from people on campus.</p>
          </div>
          <SourceSwitch source={source} onChange={setSource} label="Browse data source" />
        </header>
        <SearchField value={query} onChange={setQuery} placeholder="Search items">
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
        </SearchField>
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
        <div className="count-label">
          <span>
            {selectedCategories.size === 0
              ? 'Available now'
              : describeSelection(selectedCategories, 'All categories', 'categories')}
          </span>
          <small>
            {total} {total === 1 ? 'item' : 'items'}
          </small>
        </div>
        {loading ? (
          <AppLoader inline label="Loading items…" />
        ) : items.length ? (
          <section className="item-grid" aria-label="Available items">
            {items.map((item) => (
              <ItemCard
                key={item._id}
                item={item}
                onOpen={() => {
                  setError('')
                  setSelectedItem(item)
                }}
              >
                <OwnerDetails owner={item.owner} />
              </ItemCard>
            ))}
          </section>
        ) : (
          <BrowseEmptyState
            noItems={!hasFilters}
            onClearFilters={() => {
              setQuery('')
              setSelectedCategories(new Set())
              setSelectedAreas(new Set())
            }}
          />
        )}
        {/* Loads the next page as it nears the viewport */}
        <div ref={endRef} />
        {loadingMore && <AppLoader inline label="Loading more items..." />}
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
