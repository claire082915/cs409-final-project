import { Router } from 'express'
import mongoose from 'mongoose'
import Item from '../models/item.js'
import Loan from '../models/loan.js'
import requireUser from '../middleware/requireUser.js'
import { deletePhotos } from '../lib/cloudinary.js'
import { isOnLoan, loanedItemIds, withAvailability } from '../lib/availability.js'

// Owner can't be changed
const editableFields = ['name', 'description', 'photos']

const router = Router()
router.use(requireUser)

router.param('id', async (req, res, next, id) => {
  req.item = mongoose.isObjectIdOrHexString(id) ? await Item.findById(id) : null
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

// Runs after the Mongo update, so a Cloudinary failure only leaves unused images behind
async function deleteUnusedPhotos(urls) {
  try {
    await deletePhotos(urls)
  } catch (err) {
    console.error('Failed to delete photos from Cloudinary', err)
  }
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
  const items = await Item.find({ owner }).sort({ createdAt: -1 })
  const loanedIds = await loanedItemIds(items.map((item) => item._id))
  const itemsWithAvailability = items.map((item) => withAvailability(item, !loanedIds.has(item.id)))
  res.json({ message: 'OK', data: itemsWithAvailability })
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
  await req.item.deleteOne()
  await Loan.updateMany({ item: req.item._id, status: 'requested' }, { status: 'rejected' })
  await deleteUnusedPhotos(req.item.photos)
  res.status(204).end()
})

export default router
