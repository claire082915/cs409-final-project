import { Router } from 'express'
import Item from '../models/item.js'
import User from '../models/user.js'
import requireUser, { requireIdToken } from '../middleware/requireUser.js'
import { loanedItemIds, withAvailability } from '../lib/availability.js'
import Rating from '../models/rating.js'

const router = Router()

// Null when nobody has rated the user yet
async function reputation(userId) {
  const [result] = await Rating.aggregate([
    { $match: { ratee: userId } },
    { $group: { _id: null, average: { $avg: '$score' }, count: { $sum: 1 } } },
  ])
  return result ? { average: result.average, count: result.count } : null
}

// Called once after the first Firebase sign-in to pick a username
router.post('/', requireIdToken, async (req, res) => {
  const { username, displayName } = req.body ?? {}
  if (typeof username !== 'string' || typeof displayName !== 'string') {
    return res.status(400).json({ message: 'Username and display name are required' })
  }
  if (await User.exists({ firebaseUid: req.idToken.uid })) {
    return res.status(409).json({ message: 'Profile already exists' })
  }
  const user = await User.create({
    firebaseUid: req.idToken.uid,
    email: req.idToken.email,
    username,
    displayName,
  })
  res.status(201).json(user)
})

router.get('/:username', requireUser, async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() })
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  const items = await Item.find({ owner: user._id }).sort({ createdAt: -1 })
  const loanedIds = await loanedItemIds(items.map((item) => item._id))
  const itemsWithAvailability = items.map((item) => withAvailability(item, !loanedIds.has(item.id)))
  res.json({
    username: user.username,
    displayName: user.displayName,
    items: itemsWithAvailability,
    reputation: await reputation(user._id),
  })
})

export default router
