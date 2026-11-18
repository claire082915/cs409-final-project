import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Disclosure, DisclosurePanel, Heading } from 'react-aria-components'
import { ChevronRight, MapPin, PackageOpen, SearchX } from 'lucide-react'
import AppShell from '../components/AppShell.jsx'
import AppLoader from '../components/AppLoader.jsx'
import Avatar from '../components/Avatar.jsx'
import BorrowItemDialog from '../components/BorrowItemDialog.jsx'
import CategoryTag from '../components/CategoryTag.jsx'
import Reputation from '../components/Reputation.jsx'
import { apiFetch } from '../lib/api.js'
import { MOCK_ITEMS } from '../lib/mockItems.js'
import { mockResults } from '../lib/mockSearch.js'
import '../styles/pages/browse-borrow.css'
import '../styles/pages/search.css'

// The dropdown shows 5 of each, the page asks for more
const RESULTS_PER_SECTION = 50

function ItemResult({ item, onOpen }) {
  return (
    <article className="browse-card">
      <div className="browse-photo">
        {item.photos?.[0] ? <img src={item.photos[0]} alt="" /> : <PackageOpen size={30} />}
        <CategoryTag category={item.category} />
      </div>
      <div className="browse-card-body">
        <h3 className="browse-card-title">
          {/* Its click area covers the whole card, like on Browse */}
          <button
            className="browse-card-open"
            type="button"
            title={item.name}
            aria-haspopup="dialog"
            onClick={onOpen}
          >
            {item.name}
          </button>
        </h3>
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
    apiFetch(`search?q=${encodeURIComponent(query)}&limit=${RESULTS_PER_SECTION}`)
      .then((data) => {
        if (!cancelled) setBackendResults(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setBackendResults({ items: [], people: [] })
          setError(err.message)
        }
      })
    return () => {
      cancelled = true
    }
  }, [query])

  // Mock results show alongside real ones, like the top bar dropdown
  const mock = mockResults(query)
  const items = [...mock.items, ...(backendResults?.items ?? [])]
  const people = [...mock.people, ...(backendResults?.people ?? [])]
  const isEmpty = backendResults && items.length === 0 && people.length === 0

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
            {items.length > 0 && (
              <ResultSection title="Items" count={items.length}>
                <div className="browse-grid">
                  {items.map((item) => (
                    <ItemResult key={item._id} item={item} onOpen={() => setSelectedItem(item)} />
                  ))}
                </div>
              </ResultSection>
            )}
            {people.length > 0 && (
              <ResultSection title="People" count={people.length}>
                <div className="search-people">
                  {people.map((person) => (
                    <PersonResult key={person.username} person={person} />
                  ))}
                </div>
              </ResultSection>
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
