import { MOCK_ITEMS } from './mockItems.js'
import { MOCK_RECEIVED, MOCK_SENT } from './mockRequests.js'

// Join dates, finished loan counts and owner ratings, which the rest of the mock data doesn't carry
const MOCK_HISTORY = {
  'maya-chen': {
    joinedAt: '2025-08-24',
    lentCount: 6,
    borrowedCount: 2,
    reputation: { average: 4.9, count: 7 },
  },
  'jordan-lee': {
    joinedAt: '2025-09-03',
    lentCount: 4,
    borrowedCount: 5,
    reputation: { average: 4.5, count: 8 },
  },
  'sam-rivera': {
    joinedAt: '2026-01-19',
    lentCount: 3,
    borrowedCount: 1,
    reputation: { average: 4.7, count: 4 },
  },
  averypat18: {
    joinedAt: '2025-10-11',
    lentCount: 8,
    borrowedCount: 0,
    reputation: { average: 5, count: 6 },
  },
  'noah-brooks': {
    joinedAt: '2026-02-07',
    lentCount: 1,
    borrowedCount: 3,
    reputation: { average: 4, count: 3 },
  },
  'taylor-kim': { joinedAt: '2026-08-30', lentCount: 0, borrowedCount: 0 },
  kiml5: { joinedAt: '2025-08-28', lentCount: 2, borrowedCount: 12 },
  marchill: { joinedAt: '2026-01-23', lentCount: 0, borrowedCount: 7 },
  ethm3: { joinedAt: '2026-03-15', lentCount: 1, borrowedCount: 5 },
  jdwong: { joinedAt: '2026-09-02', lentCount: 0, borrowedCount: 3 },
  pshah4: { joinedAt: '2026-11-10', lentCount: 0, borrowedCount: 0 },
}

// Everyone in the mock data, once each, so names open a profile without the backend
function mockPeople() {
  const people = new Map()
  const everyone = [
    ...MOCK_ITEMS.map((item) => item.owner),
    ...MOCK_RECEIVED.map((request) => request.borrower),
    ...MOCK_SENT.map((request) => request.owner),
  ]
  for (const person of everyone) {
    if (!people.has(person.username)) {
      people.set(person.username, person)
    }
  }
  return [...people.values()]
}

export const MOCK_PEOPLE = mockPeople()

export function findMockProfile(username) {
  const person = MOCK_PEOPLE.find((candidate) => candidate.username === username)
  if (!person) {
    return null
  }
  const items = MOCK_ITEMS.filter((item) => item.owner.username === username)
  return {
    username: person.username,
    displayName: person.displayName,
    photo: person.photo,
    campusArea: person.campusArea ?? '',
    reputation: person.reputation ?? null,
    ...MOCK_HISTORY[username],
    items,
  }
}
