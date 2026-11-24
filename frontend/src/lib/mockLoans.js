import { MOCK_ITEMS } from './mockItems.js'
import { MOCK_INVENTORY } from './mockInventory.js'

function dayFromToday(offset) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

function mockLoan(id, item, person, status, dueIn, startedDaysAgo, message = '') {
  return {
    _id: `mock-loan-${id}`,
    item,
    status,
    dueDate: dayFromToday(dueIn),
    createdAt: dayFromToday(-startedDaysAgo),
    approvedAt: status === 'approved' ? dayFromToday(-startedDaysAgo) : undefined,
    owner: person,
    borrower: person,
    message,
  }
}

const person = (displayName, username, campusArea) => ({
  displayName,
  username,
  campusArea,
  photo: '',
})
const jordan = person('Jordan Lee', 'jordan-lee', 'Campustown')
const maya = person('Maya Chen', 'maya-chen', 'Ikenberry Commons')
const sam = person('Sam Rivera', 'sam-rivera', 'Illinois Street')
const kim = person('Kim Li', 'kiml5', 'Illinois Street')
const ethan = person('Ethan Moore', 'ethm3', 'Urbana')
const priya = person('Priya Shah', 'pshah4', 'Lincoln Avenue')

const camera = MOCK_ITEMS.find((item) => item._id === 'mock-camera')
const textbook = MOCK_ITEMS.find((item) => item._id === 'mock-textbook')
const laptop = MOCK_INVENTORY.find((item) => item._id === 'mock-laptop')
const tent = MOCK_INVENTORY.find((item) => item._id === 'mock-tent')
const projector = MOCK_INVENTORY.find((item) => item._id === 'mock-projector')
const earbuds = MOCK_INVENTORY.find((item) => item._id === 'mock-earbuds')
const skateboard = MOCK_INVENTORY.find((item) => item._id === 'mock-skateboard')

export const MOCK_LOANS = {
  borrowed: [
    mockLoan('borrowed-camera', camera, sam, 'approved', 5, 2),
    mockLoan(
      'borrowed-textbooks',
      textbook,
      jordan,
      'requested',
      12,
      1,
      'I’ll take good care of these books!',
    ),
    mockLoan('borrowed-earbuds', earbuds, maya, 'approved', -3, 9),
    mockLoan('borrowed-skateboard', skateboard, priya, 'confirmed', -8, 17),
  ],
  lent: [
    mockLoan(
      'lent-laptop',
      laptop,
      kim,
      'requested',
      7,
      1,
      'Could I borrow this for my CS project?',
    ),
    mockLoan('lent-tent', tent, ethan, 'approved', 4, 3),
    mockLoan('lent-projector', projector, jordan, 'returned', 0, 10),
    mockLoan('lent-skateboard', skateboard, maya, 'confirmed', -6, 20),
  ],
}
