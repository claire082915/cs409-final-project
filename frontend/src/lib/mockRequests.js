import { getLocalTimeZone, today } from '@internationalized/date'
import { MOCK_INVENTORY } from './mockInventory.js'
import { MOCK_ITEMS } from './mockItems.js'

// Dates count from today so the mock requests never fall in the past
function daysFromToday(days) {
  return today(getLocalTimeZone()).add({ days }).toString()
}

// Received requests are for your items on My Items, several can point at the same one
const MOCK_MACBOOK = MOCK_INVENTORY.find((item) => item._id === 'mock-laptop')
const MOCK_TENT = MOCK_INVENTORY.find((item) => item._id === 'mock-tent')
const MOCK_EARBUDS = MOCK_INVENTORY.find((item) => item._id === 'mock-earbuds')

// The MacBook has two requests and the tent has two waiting while it's lent out
export const MOCK_RECEIVED = [
  {
    _id: 'mock-request-1',
    status: 'requested',
    dueDate: daysFromToday(7),
    createdAt: daysFromToday(-1),
    borrower: {
      displayName: 'Kim Li',
      username: 'kiml5',
      photo: '',
      campusArea: 'Illinois Street (ISR)',
      reputation: { average: 4.8, count: 12 },
      trust: 'standard',
    },
    item: MOCK_MACBOOK,
    message: "Hi! I'd love to borrow this for my CS 225 project. I'll take good care of it!",
  },
  {
    _id: 'mock-request-2',
    status: 'requested',
    dueDate: daysFromToday(5),
    createdAt: daysFromToday(-3),
    borrower: {
      displayName: 'Marcus Hill',
      username: 'marchill',
      photo: '',
      campusArea: 'Lincoln Avenue (LAR)',
      reputation: { average: 3.6, count: 7 },
      trust: 'trusted',
    },
    item: MOCK_MACBOOK,
    message: 'Mine stopped working right before finals, could I use it through the weekend?',
  },
  {
    _id: 'mock-request-3',
    status: 'requested',
    dueDate: daysFromToday(4),
    createdAt: daysFromToday(-2),
    borrower: {
      displayName: 'Ethan Moore',
      username: 'ethm3',
      photo: '',
      campusArea: 'Urbana',
      reputation: { average: 4.2, count: 5 },
      trust: 'standard',
    },
    item: MOCK_TENT,
    message: 'Could I borrow this for a weekend camping trip? I can pick it up Friday.',
  },
  {
    _id: 'mock-request-4',
    status: 'requested',
    dueDate: daysFromToday(12),
    createdAt: daysFromToday(0),
    borrower: {
      displayName: 'Jade Wong',
      username: 'jdwong',
      photo: '',
      campusArea: 'Florida Avenue (FAR)',
      reputation: { average: 5, count: 3 },
      trust: 'trusted',
    },
    item: MOCK_TENT,
  },
  {
    _id: 'mock-request-5',
    status: 'requested',
    dueDate: daysFromToday(2),
    createdAt: daysFromToday(-4),
    borrower: {
      displayName: 'Priya Shah',
      username: 'pshah4',
      photo: '',
      reputation: null,
      trust: 'new',
    },
    item: MOCK_EARBUDS,
  },
]

// Sent requests are for items on Browse, so they point at those entries
const MOCK_CAMERA = MOCK_ITEMS.find((item) => item._id === 'mock-camera')
const MOCK_TEXTBOOKS = MOCK_ITEMS.find((item) => item._id === 'mock-textbook')

export const MOCK_SENT = [
  {
    _id: 'mock-sent-1',
    status: 'requested',
    dueDate: daysFromToday(9),
    createdAt: daysFromToday(0),
    owner: MOCK_CAMERA.owner,
    item: MOCK_CAMERA,
    message: 'Hoping to take photos of the Quad Day booths with it, can return it Sunday night.',
  },
  {
    _id: 'mock-sent-2',
    status: 'requested',
    dueDate: daysFromToday(14),
    createdAt: daysFromToday(-2),
    owner: MOCK_TEXTBOOKS.owner,
    item: MOCK_TEXTBOOKS,
  },
]
