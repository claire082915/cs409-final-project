import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import { uniqBy } from 'lodash-es'
import { toast } from 'sonner'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components'
import { ChevronRight, MapPin, PackageOpen, SearchX } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import BorrowItemDialog from '../components/BorrowItemDialog.jsx'
import ItemNameButton from '../components/ItemNameButton.jsx'
import ItemTags from '../components/ItemTags.jsx'
import Reputation from '../components/Reputation.jsx'
import { apiFetch } from '../lib/api.js'
import { MOCK_ITEMS } from '../lib/mockItems.js'
import { mockResults } from '../lib/mockSearch.js'
import '../styles/pages/browse-borrow.css'
import '../styles/pages/search.css'

// Two rows of the 3 column item grid before Show all
const FIRST_RESULTS = 6
// A multiple of the 3, 2 and 1 column grids so every page fills whole rows
const RESULTS_PER_PAGE = 12

function ItemResult({ item, onOpen }) {
  return (
    <article className="browse-card">
      <div className="browse-photo">
        {item.photos?.[0] ? <img src={item.photos[0]} alt="" /> : <PackageOpen size={30} />}
      </div>
      <div className="browse-card-body">
        <h3 className="browse-card-title">
          {/* Its click area covers the whole card, like on Browse */}
          <ItemNameButton name={item.name} className="browse-card-open" onClick={onOpen} />
        </h3>
        <ItemTags category={item.category} condition={item.condition} />
        <div className="browse-owner-details">
          {/* Owner is null when they hid their profile */}
          <p className="browse-owner">
            {item.owner ? (
              <Link to={`/profile/${item.owner.username}`} className="browse-owner-link">
                <Avatar
                  photo={item.owner.photo}
                  name={item.owner.displayName}
                  username={item.owner.username}
                  className="browse-owner-avatar"
                />
                <span>{item.owner.displayName}</span>
              </Link>
            ) : (
              <span>Community member</span>
            )}
          </p>
          {/* Results mix both, so only lent items get a label */}
          {item.available === false && <p className="search-item-lent">Lent</p>}
        </div>
      </div>
    </article>
  )
}

function PersonResult({ person }) {
  return (
    <Link to={`/profile/${person.username}`} className="search-person">
      <Avatar
        photo={person.photo}
        name={person.displayName}
        username={person.username}
        className="search-person-photo"
      />
      <span className="search-person-text">
        <strong>{person.displayName}</strong>
        <small>@{person.username}</small>
        <Reputation reputation={person.reputation} />
        {person.campusArea && (
          <small className="search-person-area">
            <MapPin size={13} aria-hidden="true" />
            {person.campusArea}
          </small>
        )}
      </span>
    </Link>
  )
}

// Both sections start open and fold from their label
function ResultSection({ title, count, children }) {
  return (
    <Disclosure className="search-section" defaultExpanded>
      <Heading level={2} className="search-section-heading">
        <Button slot="trigger" className="search-section-toggle">
          <ChevronRight size={16} className="search-section-chevron" aria-hidden="true" />
          <span>{title}</span>
          <small>{count}</small>
        </Button>
      </Heading>
      <DisclosurePanel>{children}</DisclosurePanel>
    </Disclosure>
  )
}

const TOTAL_FIELDS = { items: 'itemTotal', people: 'peopleTotal' }

// Shows the first few, then Show all loads the rest a page at a time as the end scrolls into view
function PagedSection({
  title,
  type,
  query,
  mockResults,
  firstResults,
  firstTotal,
  renderResults,
}) {
  const [isShowingAll, setIsShowingAll] = useState(false)
  const [results, setResults] = useState(firstResults)
  const [total, setTotal] = useState(firstTotal)
  // Results fetched so far, counting repeats, so paging always moves forward
  const [nextSkip, setNextSkip] = useState(firstResults.length)
  const [loadingMore, setLoadingMore] = useState(false)
  const { ref: endRef, inView: isEndInView } = useInView({ rootMargin: '400px' })
  const count = mockResults.length + total

  // Runs again after each page while the end of the list stays in view
  useEffect(() => {
    if (!isShowingAll || !isEndInView || loadingMore || nextSkip >= total) {
      return
    }
    setLoadingMore(true)
    const params = new URLSearchParams({
      q: query,
      type,
      skip: nextSkip,
      limit: RESULTS_PER_PAGE,
    })
    apiFetch(`search?${params}`)
      .then((data) => {
        // Skip paging can repeat a result when the list shifts mid-scroll, so keep the first copy
        setResults((current) => uniqBy([...current, ...data[type]], '_id'))
        setNextSkip((skip) => skip + data[type].length)
        // The list might have grown or shrunk since the first page
        setTotal(data[TOTAL_FIELDS[type]])
      })
      .catch((err) => toast.error(err.message))
      .finally(() => setLoadingMore(false))
  }, [isShowingAll, isEndInView, loadingMore, nextSkip, total])

  const allResults = [...mockResults, ...results]
  return (
    <ResultSection title={title} count={count}>
      {renderResults(isShowingAll ? allResults : allResults.slice(0, FIRST_RESULTS))}
      {!isShowingAll && count > FIRST_RESULTS && (
        <button type="button" className="search-show-all" onClick={() => setIsShowingAll(true)}>
          Show all {count}
        </button>
      )}
      {isShowingAll && <div ref={endRef} />}
      {loadingMore && <AppLoader inline label="Loading more..." />}
    </ResultSection>
  )
}

export default function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') ?? '').trim()
  const [backendResults, setBackendResults] = useState(null)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    if (!query) {
      return
    }
    let cancelled = false
    setBackendResults(null)
    setError('')
    apiFetch(`search?q=${encodeURIComponent(query)}&limit=${FIRST_RESULTS}`)
      .then((data) => {
        if (!cancelled) setBackendResults(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setBackendResults({ items: [], people: [], itemTotal: 0, peopleTotal: 0 })
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [query])

  // Mock results show alongside real ones, like the top bar dropdown
  const mock = mockResults(query)
  const isEmpty =
    backendResults &&
    mock.items.length + backendResults.itemTotal === 0 &&
    mock.people.length + backendResults.peopleTotal === 0

  return (
    <AppShell>
      <main className="search-page">
        <header className="page-heading">
          <h1>Search</h1>
          <p>
            {query ? `Results for "${query}"` : 'Type in the search bar to find items or people.'}
          </p>
        </header>
        {query && !backendResults ? (
          <AppLoader inline label="Searching..." />
        ) : isEmpty ? (
          <div className="search-empty">
            <SearchX size={26} aria-hidden="true" />
            <strong>No matches</strong>
            {/* A failed search only shows when there's nothing else to show, like the top bar */}
            <span role={error ? 'alert' : undefined}>
              {error || 'Try a different word or check the spelling.'}
            </span>
          </div>
        ) : (
          <>
            {mock.items.length + backendResults.itemTotal > 0 && (
              <PagedSection
                title="Items"
                type="items"
                query={query}
                mockResults={mock.items}
                firstResults={backendResults.items}
                firstTotal={backendResults.itemTotal}
                renderResults={(items) => (
                  <div className="browse-grid">
                    {items.map((item) => (
                      <ItemResult key={item._id} item={item} onOpen={() => setSelectedItem(item)} />
                    ))}
                  </div>
                )}
              />
            )}
            {mock.people.length + backendResults.peopleTotal > 0 && (
              <PagedSection
                title="People"
                type="people"
                query={query}
                mockResults={mock.people}
                firstResults={backendResults.people}
                firstTotal={backendResults.peopleTotal}
                renderResults={(people) => (
                  <div className="search-people">
                    {people.map((person) => (
                      <PersonResult key={person.username} person={person} />
                    ))}
                  </div>
                )}
              />
            )}
          </>
        )}
        {selectedItem && (
          <BorrowItemDialog
            item={selectedItem}
            isMock={MOCK_ITEMS.includes(selectedItem)}
            onClose={() => setSelectedItem(null)}
            onSent={(message) => {
              toast.success(message)
              setSelectedItem(null)
            }}
          />
        )}
      </main>
    </AppShell>
  )
}
