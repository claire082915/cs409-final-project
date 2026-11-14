import { Router } from 'express'
import Item from '../models/item.js'
import User from '../models/user.js'
import requireUser from '../middleware/requireUser.js'
import { loanedItemIds, withAvailability } from '../lib/availability.js'
import { publicOwner } from '../lib/publicProfile.js'

// Enough to fill the top bar dropdown without scrolling
const RESULTS_PER_SECTION = 5

const router = Router()
router.use(requireUser)

// Other people's items whose name matches, newest first
async function searchItems(pattern, userId) {
  const items = await Item.find({ name: pattern, owner: { $ne: userId }, deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(RESULTS_PER_SECTION)
    .populate('owner', 'username displayName photo preferences.showProfile')
  const loanedIds = await loanedItemIds(items.map((item) => item._id))
  const matchingItems = []
  for (const item of items) {
    matchingItems.push({
      ...withAvailability(item, !loanedIds.has(item.id)),
      owner: publicOwner(item.owner),
    })
  }
  return matchingItems
}

// Other users with a visible profile whose username or display name matches
function searchPeople(pattern, userId) {
  return User.find({
    _id: { $ne: userId },
    'preferences.showProfile': { $ne: false },
    $or: [{ username: pattern }, { displayName: pattern }],
  })
    .select('username displayName photo')
    .sort({ username: 1 })
    .limit(RESULTS_PER_SECTION)
}

router.get('/', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!query) {
    return res.status(400).json({ message: 'Missing search query', data: {} })
  }
  // Escape so characters like "." or "(" match themselves
  const pattern = new RegExp(RegExp.escape(query), 'i')
  const [items, people] = await Promise.all([
    searchItems(pattern, req.userId),
    searchPeople(pattern, req.userId),
  ])
  res.json({ message: 'OK', data: { items, people } })
})

export default router
