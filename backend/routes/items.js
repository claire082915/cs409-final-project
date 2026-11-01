import { Router } from 'express'
import mongoose from 'mongoose'
import Item from '../models/item.js'
import requireUser from '../middleware/requireUser.js'
import { deletePhotos } from '../lib/cloudinary.js'

// Owner can't be changed
const editableFields = ['name', 'description', 'photos']

const router = Router()
router.use(requireUser)

router.param('id', async (req, res, next, id) => {
  req.item = await Item.findById(id)
  if (!req.item) {
    return res.status(404).json({ message: 'Item not found' })
  }
  next()
})

function requireOwner(req, res, next) {
  if (!req.item.owner.equals(req.userId)) {
    return res.status(403).json({ message: 'Only the owner can change this item' })
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
  res.status(201).json(item)
})

// TODO: Filter by availability from active loans once loans exist
router.get('/', async (req, res) => {
  const { owner } = req.query
  // Without an owner the query would return every item
  if (!mongoose.isObjectIdOrHexString(owner)) {
    return res.status(400).json({ message: 'Missing or invalid owner query' })
  }
  const items = await Item.find({ owner }).sort({ createdAt: -1 })
  res.json(items)
})

router.get('/:id', (req, res) => {
  res.json(req.item)
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
  res.json(req.item)
})

// TODO: Block this while the item is on loan once loans exist
router.delete('/:id', requireOwner, async (req, res) => {
  await req.item.deleteOne()
  await deleteUnusedPhotos(req.item.photos)
  res.status(204).end()
})

export default router
