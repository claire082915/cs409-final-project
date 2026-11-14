import { Router } from 'express'
import mongoose from 'mongoose'
import Item from '../models/item.js'
import Loan from '../models/loan.js'
import User from '../models/user.js'
import requireUser from '../middleware/requireUser.js'
import { deleteUnusedPhotos } from '../lib/cloudinary.js'
import { isOnLoan, loanedItemIds, withAvailability } from '../lib/availability.js'
import { publicOwner } from '../lib/publicProfile.js'

// Owner can't be changed
const editableFields = ['name', 'description', 'photos']
// Range of the Browse distance slider
const MIN_MILES = 5
const MAX_MILES = 100
const DEFAULT_MILES = 10
const METERS_PER_MILE = 1609.344

const router = Router()
router.use(requireUser)

router.param('id', async (req, res, next, id) => {
  req.item = mongoose.isObjectIdOrHexString(id)
    ? await Item.findOne({ _id: id, deletedAt: null })
    : null
  if (!req.item) {
    return res.status(404).json({ message: 'Item not found', data: {} })
  }
  next()
})

function requireOwner(req, res, next) {
  if (!req.item.owner.equals(req.userId)) {
    return res.status(403).json({ message: 'Only the owner can change this item', data: {} })
  }
  next()
}

router.post('/', async (req, res) => {
  // Body is undefined when none is sent
  const body = req.body ?? {}
  const fields = {}
  for (const field of editableFields) {
    fields[field] = body[field]
  }
  const item = await Item.create({ ...fields, owner: req.userId })
  // A new item has no loans yet
  res.status(201).json({ message: 'OK', data: withAvailability(item, true) })
})

router.get('/', async (req, res) => {
  const { owner } = req.query
  // Without an owner the query would return every item
  if (!mongoose.isObjectIdOrHexString(owner)) {
    return res.status(400).json({ message: 'Missing or invalid owner query', data: {} })
  }
  const items = await Item.find({ owner, deletedAt: null }).sort({ createdAt: -1 })
  const loanedIds = await loanedItemIds(items.map((item) => item._id))
  const itemsWithAvailability = items.map((item) => withAvailability(item, !loanedIds.has(item.id)))
  res.json({ message: 'OK', data: itemsWithAvailability })
})

// Owners within the radius with their distance in meters, nearest first, not counting the caller
function nearbyOwners(user, miles) {
  return User.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [...user.location.coordinates] },
        distanceField: 'distance',
        maxDistance: miles * METERS_PER_MILE,
        query: { _id: { $ne: user._id } },
      },
    },
    {
      $project: {
        username: 1,
        displayName: 1,
        photo: 1,
        'preferences.showProfile': 1,
        distance: 1,
      },
    },
  ])
}

// Registered before /:id so "nearby" isn't read as an item id
router.get('/nearby', async (req, res) => {
  const miles = Number(req.query.miles ?? DEFAULT_MILES)
  if (!(miles >= MIN_MILES && miles <= MAX_MILES)) {
    return res
      .status(400)
      .json({ message: `miles must be between ${MIN_MILES} and ${MAX_MILES}`, data: {} })
  }
  if (!req.user.location?.coordinates) {
    return res
      .status(400)
      .json({ message: 'Add your ZIP code in Settings to see items near you', data: {} })
  }
  const owners = await nearbyOwners(req.user, miles)
  const ownersById = new Map(owners.map((owner) => [String(owner._id), owner]))
  // Newest first here, then the stable sort below keeps that order within the same distance
  const items = await Item.find({ owner: { $in: [...ownersById.keys()] }, deletedAt: null }).sort({
    createdAt: -1,
  })
  const loanedIds = await loanedItemIds(items.map((item) => item._id))
  const nearbyItems = []
  for (const item of items) {
    const owner = ownersById.get(String(item.owner))
    nearbyItems.push({
      ...withAvailability(item, !loanedIds.has(item.id)),
      owner: publicOwner(owner),
      distanceMiles: Math.round((owner.distance / METERS_PER_MILE) * 10) / 10,
    })
  }
  nearbyItems.sort((a, b) => a.distanceMiles - b.distanceMiles)
  res.json({ message: 'OK', data: nearbyItems })
})

router.get('/:id', async (req, res) => {
  res.json({ message: 'OK', data: withAvailability(req.item, !(await isOnLoan(req.item._id))) })
})

router.patch('/:id', requireOwner, async (req, res) => {
  const body = req.body ?? {}
  const oldPhotos = [...req.item.photos]
  for (const field of editableFields) {
    if (body[field] !== undefined) {
      req.item[field] = body[field]
    }
  }
  await req.item.save()
  const removedPhotos = oldPhotos.filter((url) => !req.item.photos.includes(url))
  await deleteUnusedPhotos(removedPhotos)
  res.json({ message: 'OK', data: withAvailability(req.item, !(await isOnLoan(req.item._id))) })
})

router.delete('/:id', requireOwner, async (req, res) => {
  if (await isOnLoan(req.item._id)) {
    return res.status(409).json({ message: "Can't delete an item while it's on loan", data: {} })
  }
  // Keep the doc and its photos so past loans can still show the item
  req.item.deletedAt = new Date()
  await req.item.save()
  await Loan.updateMany({ item: req.item._id, status: 'requested' }, { status: 'rejected' })
  res.status(204).end()
})

export default router
