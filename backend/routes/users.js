import { Router } from 'express'
import Item from '../models/item.js'
import User from '../models/user.js'
import requireUser from '../middleware/requireUser.js'
import { loanedItemIds, withAvailability } from '../lib/availability.js'
import Rating from '../models/rating.js'

const router = Router()
router.use(requireUser)

// Null when nobody has rated the user yet
async function reputation(userId) {
  const [result] = await Rating.aggregate([
    { $match: { ratee: userId } },
    { $group: { _id: null, average: { $avg: '$score' }, count: { $sum: 1 } } },
  ])
  return result ? { average: result.average, count: result.count } : null
}

router.get('/:username', async (req, res) => {
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
