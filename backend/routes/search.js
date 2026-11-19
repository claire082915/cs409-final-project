import { Router } from 'express'
import Item from '../models/item.js'
import User from '../models/user.js'
import requireUser from '../middleware/requireUser.js'
import { loanedItemIds, withAvailability } from '../lib/availability.js'
import { publicOwner } from '../lib/publicProfile.js'
import { reputationsByUser } from '../lib/reputation.js'

// Enough to fill the top bar dropdown without scrolling
const RESULTS_PER_SECTION = 5
// The search page asks for more, capped so one search can't pull the whole collection
const MAX_RESULTS_PER_SECTION = 50

const router = Router()
router.use(requireUser)

// Other people's items whose name matches, newest first
async function searchItems(pattern, userId, limit) {
  const items = await Item.find({ name: pattern, owner: { $ne: userId }, deletedAt: null })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('owner', 'username displayName photo campusArea preferences.showProfile')
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

// Other users with a visible profile who match nameFilter, with their rating
async function searchPeople(nameFilter, userId, limit) {
  const people = await User.find({
    _id: { $ne: userId },
    'preferences.showProfile': { $ne: false },
    ...nameFilter,
  })
    .select('username displayName photo campusArea')
    .sort({ username: 1 })
    .limit(limit)
  const reputations = await reputationsByUser(people.map((person) => person._id))
  const peopleWithReputation = []
  for (const person of people) {
    peopleWithReputation.push({
      ...person.toJSON(),
      reputation: reputations.get(String(person._id)) ?? null,
    })
  }
  return peopleWithReputation
}

router.get('/', async (req, res) => {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (!query) {
    return res.status(400).json({ message: 'Missing search query', data: {} })
  }
  let limit = RESULTS_PER_SECTION
  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit)
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_RESULTS_PER_SECTION) {
      return res
        .status(400)
        .json({ message: `limit must be from 1 to ${MAX_RESULTS_PER_SECTION}`, data: {} })
    }
  }
  // "@may" looks up usernames starting with "may" and skips items
  if (query.startsWith('@')) {
    const usernamePrefix = new RegExp(`^${RegExp.escape(query.slice(1))}`, 'i')
    const people = await searchPeople({ username: usernamePrefix }, req.userId, limit)
    return res.json({ message: 'OK', data: { items: [], people } })
  }
  // Escape so characters like "." or "(" match themselves
  const pattern = new RegExp(RegExp.escape(query), 'i')
  const nameFilter = { $or: [{ username: pattern }, { displayName: pattern }] }
  const [items, people] = await Promise.all([
    searchItems(pattern, req.userId, limit),
    searchPeople(nameFilter, req.userId, limit),
  ])
  res.json({ message: 'OK', data: { items, people } })
})

export default router
