import { Router } from 'express'
import Item from '../models/item.js'
import User from '../models/user.js'
import requireUser from '../middleware/requireUser.js'
import { loanedItemIds, withAvailability } from '../lib/availability.js'
import { publicOwner } from '../lib/publicProfile.js'
import { reputationsByUser } from '../lib/reputation.js'

// Enough to fill the top bar dropdown without scrolling
const RESULTS_PER_SECTION = 5
// The search page asks for more a page at a time, capped so one request can't pull the whole collection
const MAX_RESULTS_PER_SECTION = 50

const router = Router()
router.use(requireUser)

function itemFilter(pattern, userId) {
  return { name: pattern, owner: { $ne: userId }, deletedAt: null }
}

// Other people's items whose name matches, newest first
async function searchItems(pattern, userId, skip, limit) {
  const items = await Item.find(itemFilter(pattern, userId))
    .sort({ createdAt: -1, _id: -1 })
    .skip(skip)
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

function peopleFilter(nameFilter, userId) {
  return { _id: { $ne: userId }, 'preferences.showProfile': { $ne: false }, ...nameFilter }
}

// Other users with a visible profile who match nameFilter, with their rating
async function searchPeople(nameFilter, userId, skip, limit) {
  const people = await User.find(peopleFilter(nameFilter, userId))
    .select('username displayName photo campusArea')
    .sort({ username: 1 })
    .skip(skip)
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
  const skip = Number(req.query.skip ?? 0)
  if (!Number.isInteger(skip) || skip < 0) {
    return res.status(400).json({ message: 'skip must be a whole number', data: {} })
  }
  // The search page loads more of one section at a time
  const wantsItems = req.query.type !== 'people'
  const wantsPeople = req.query.type !== 'items'
  // "@may" looks up usernames starting with "may" and skips items
  if (query.startsWith('@')) {
    const usernamePrefix = new RegExp(`^${RegExp.escape(query.slice(1))}`, 'i')
    const nameFilter = { username: usernamePrefix }
    const [people, peopleTotal] = await Promise.all([
      searchPeople(nameFilter, req.userId, skip, limit),
      User.countDocuments(peopleFilter(nameFilter, req.userId)),
    ])
    return res.json({ message: 'OK', data: { items: [], people, itemTotal: 0, peopleTotal } })
  }
  // Escape so characters like "." or "(" match themselves
  const pattern = new RegExp(RegExp.escape(query), 'i')
  const nameFilter = { $or: [{ username: pattern }, { displayName: pattern }] }
  const [items, people, itemTotal, peopleTotal] = await Promise.all([
    wantsItems ? searchItems(pattern, req.userId, skip, limit) : [],
    wantsPeople ? searchPeople(nameFilter, req.userId, skip, limit) : [],
    Item.countDocuments(itemFilter(pattern, req.userId)),
    User.countDocuments(peopleFilter(nameFilter, req.userId)),
  ])
  res.json({ message: 'OK', data: { items, people, itemTotal, peopleTotal } })
})

export default router
