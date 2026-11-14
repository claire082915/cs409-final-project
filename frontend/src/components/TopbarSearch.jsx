import { useEffect, useRef, useState } from 'react'
import {
  ComboBox,
  Group,
  Header,
  Input,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
} from 'react-aria-components'
import { Package, Search, UserRound } from 'lucide-react'
import { apiFetch } from '../lib/api.js'
import '../styles/components/form-controls.css'
import '../styles/components/topbar-search.css'

// Wait for a pause in typing so each keystroke doesn't send a request
const DEBOUNCE_MS = 300
const IS_MAC = navigator.userAgent.includes('Mac')
const MOCK_ITEMS = [
  { _id: 'mock-laptop', name: 'MacBook Pro', ownerName: 'Maya Chen', photos: [] },
  { _id: 'mock-tent', name: '2-person Camping Tent', ownerName: 'Jordan Lee', photos: [] },
  { _id: 'mock-camera', name: 'Mirrorless Camera', ownerName: 'Sam Rivera', photos: [] },
  {
    _id: 'mock-textbook',
    name: 'Computer Science Textbooks',
    ownerName: 'Avery Patel',
    photos: [],
  },
  { _id: 'mock-skateboard', name: 'Skateboard', ownerName: 'Noah Brooks', photos: [] },
  { _id: 'mock-earbuds', name: 'Wireless Earbuds', ownerName: 'Taylor Kim', photos: [] },
]
const MOCK_PEOPLE = MOCK_ITEMS.map((item) => ({
  _id: `person-${item._id}`,
  displayName: item.ownerName,
  username: item.ownerName.toLowerCase().replaceAll(' ', '-'),
  photo: '',
}))

function SearchThumb({ photo, icon: Icon, isPerson }) {
  return (
    <span className={`search-thumb${isPerson ? ' is-person' : ''}`}>
      {photo ? <img src={photo} alt="" /> : <Icon size={15} aria-hidden="true" />}
    </span>
  )
}

function ItemOption({ item }) {
  const ownerName =
    item.ownerName || item.owner?.displayName || item.owner?.username || 'Community member'
  return (
    <ListBoxItem
      id={`item-${item._id}`}
      textValue={item.name}
      href={`#/item/${encodeURIComponent(item.name)}`}
      className="field-option"
    >
      <SearchThumb photo={item.photos[0]} icon={Package} />
      <span className="search-text">
        <strong>{item.name}</strong>
        <small>
          {ownerName}
          {item.available === false && ' · On loan'}
        </small>
      </span>
    </ListBoxItem>
  )
}

function PersonOption({ person }) {
  return (
    <ListBoxItem
      id={`person-${person._id}`}
      textValue={person.displayName}
      href={`#/profile/${encodeURIComponent(person.displayName)}`}
      className="field-option"
    >
      <SearchThumb photo={person.photo} icon={UserRound} isPerson />
      <span className="search-text">
        <strong>{person.displayName}</strong>
        <small>@{person.username}</small>
      </span>
    </ListBoxItem>
  )
}

export default function TopbarSearch() {
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)

  useEffect(() => {
    const focusSearch = (event) => {
      const hasShortcutModifier = IS_MAC ? event.metaKey : event.ctrlKey
      if (hasShortcutModifier && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      return
    }
    let isCurrent = true
    const timer = setTimeout(() => {
      apiFetch(`search?q=${encodeURIComponent(trimmed)}`)
        .then((data) => isCurrent && setResults({ query: trimmed, ...data }))
        .catch((error) => isCurrent && setResults({ query: trimmed, items: [], people: [], error }))
    }, DEBOUNCE_MS)
    return () => {
      isCurrent = false
      clearTimeout(timer)
    }
  }, [query])

  // Results for older text stay hidden until the latest search comes back
  const trimmedQuery = query.trim()
  const currentResults = results?.query === trimmedQuery ? results : null
  const mockItems = trimmedQuery
    ? MOCK_ITEMS.filter((item) =>
        `${item.name} ${item.ownerName}`.toLowerCase().includes(trimmedQuery.toLowerCase()),
      )
    : []
  const mockPeople = trimmedQuery
    ? MOCK_PEOPLE.filter((person) =>
        `${person.displayName} ${person.username}`
          .toLowerCase()
          .includes(trimmedQuery.toLowerCase()),
      )
    : []
  const items = [...mockItems, ...(currentResults?.items ?? [])]
  const people = [...mockPeople, ...(currentResults?.people ?? [])]

  return (
    <ComboBox
      className="app-search"
      aria-label="Search items or people"
      inputValue={query}
      onInputChange={setQuery}
      selectedKey={null}
      allowsCustomValue
      allowsEmptyCollection
    >
      <Group className="app-search-field">
        <Search size={16} aria-hidden="true" />
        <Input ref={inputRef} placeholder="Search items or people..." />
        <kbd>{IS_MAC ? '⌘ K' : 'Ctrl K'}</kbd>
      </Group>
      <Popover className="field-popover search-popover" placement="bottom start">
        <ListBox
          className="field-list"
          renderEmptyState={() =>
            currentResults && (
              <p className="field-empty">
                {currentResults.error?.message ??
                  `No items or people match "${currentResults.query}"`}
              </p>
            )
          }
        >
          {items.length > 0 && (
            <ListBoxSection>
              <Header className="search-heading">Items</Header>
              {items.map((item) => (
                <ItemOption key={item._id} item={item} />
              ))}
            </ListBoxSection>
          )}
          {people.length > 0 && (
            <ListBoxSection>
              <Header className="search-heading">People</Header>
              {people.map((person) => (
                <PersonOption key={person._id} person={person} />
              ))}
            </ListBoxSection>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}
