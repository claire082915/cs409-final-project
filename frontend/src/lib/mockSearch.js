import { MOCK_ITEMS } from './mockItems.js'
import { MOCK_PEOPLE, findMockProfile } from './mockProfiles.js'

// Matches the backend, "@may" finds usernames starting with "may" and no items
function mockUsernameResults(query) {
  const prefix = query.slice(1).toLowerCase()
  const people = []
  for (const person of MOCK_PEOPLE) {
    if (person.username.startsWith(prefix)) {
      people.push(findMockProfile(person.username))
    }
  }
  return { items: [], people }
}

// Matches the backend, which searches item names and people's names and usernames
export function mockResults(query) {
  if (query.startsWith('@')) {
    return mockUsernameResults(query)
  }
  const text = query.toLowerCase()
  const items = MOCK_ITEMS.filter((item) => item.name.toLowerCase().includes(text))
  const people = []
  for (const person of MOCK_PEOPLE) {
    if (`${person.displayName} ${person.username}`.toLowerCase().includes(text)) {
      // The mock profile carries the rating, which the mock items' owners don't
      people.push(findMockProfile(person.username))
    }
  }
  return { items, people }
}
