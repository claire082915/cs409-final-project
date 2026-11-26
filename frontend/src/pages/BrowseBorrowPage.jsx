import { useEffect, useRef, useState } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { fadeInCards } from '../lib/fadeInCards.js'
import { useInView } from 'react-intersection-observer'
import { useSearchParams } from 'react-router-dom'
import { useDebounce } from 'use-debounce'
import { uniqBy } from 'lodash-es'
import { toast } from 'sonner'
import { Check, PackageOpen, SearchX, X } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import SearchField from '../components/SearchField.jsx'
import ItemCard from '../components/ItemCard.jsx'
import EmptyState from '../components/EmptyState.jsx'
import AppLoader from '../components/AppLoader.jsx'
import BorrowItemDialog from '../components/BorrowItemDialog.jsx'
import OwnerDetails from '../components/OwnerDetails.jsx'
import FilterMenu, { describeSelection } from '../components/FilterMenu.jsx'
import { CAMPUS_AREAS } from '../lib/campusAreas.js'
import { ITEM_CATEGORIES } from '../lib/itemCategories.js'
import { apiFetch } from '../lib/api.js'
import { useFiltersInUrl } from '../lib/useFiltersInUrl.js'
import '../styles/pages/browse-borrow.css'

// Waits for a pause in typing before asking the backend
const SEARCH_DELAY_MS = 300

function browseParams({ query, categories, areas }) {
  const params = new URLSearchParams()
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

function loadBrowsePage(filters, skip) {
  const params = browseParams(filters)
  params.set('skip', skip)
  return apiFetch(`items/browse?${params}`)
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
    <EmptyState icon={SearchX} title="No matching items">
      <button
        type="button"
        className="action-button action-button-neutral"
        onClick={onClearFilters}
      >
        Clear filters
      </button>
    </EmptyState>
  )
}

export default function BrowseBorrowPage() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  // Results fetched so far, counting repeats, so paging always moves forward
  const [nextSkip, setNextSkip] = useState(0)
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [debouncedQuery] = useDebounce(query.trim(), SEARCH_DELAY_MS)
  const [selectedCategories, setSelectedCategories] = useState(
    () => new Set(searchParams.getAll('category')),
  )
  const [selectedAreas, setSelectedAreas] = useState(() => new Set(searchParams.getAll('area')))
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  // Bumped on each new search so a slow page from the old one is dropped
  const searchId = useRef(0)
  const { ref: endRef, inView: isEndInView } = useInView({ rootMargin: '400px' })
  const [gridRef] = useAutoAnimate(fadeInCards)

  const filters = { query: debouncedQuery, categories: selectedCategories, areas: selectedAreas }
  const hasFilters = debouncedQuery !== '' || selectedCategories.size > 0 || selectedAreas.size > 0
  useFiltersInUrl(browseParams(filters))

  useEffect(() => {
    const id = ++searchId.current
    setLoading(true)
    setError('')
    loadBrowsePage(filters, 0)
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
  }, [debouncedQuery, selectedCategories, selectedAreas])

  // Runs again after each page while the end of the grid stays in view
  useEffect(() => {
    if (!isEndInView || loading || loadingMore || nextSkip >= total) {
      return
    }
    const id = searchId.current
    setLoadingMore(true)
    loadBrowsePage(filters, nextSkip)
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
        {/* Keep the current cards up while new filters load so the grid doesn't blank out */}
        {loading && !items.length ? (
          <AppLoader inline label="Loading items…" />
        ) : items.length ? (
          <section className="item-grid" aria-label="Available items" ref={gridRef}>
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
