import { Router } from 'express'
import mongoose from 'mongoose'
import Item from '../models/item.js'
import Loan, { ACTIVE_STATUSES } from '../models/loan.js'
import User from '../models/user.js'
import requireUser from '../middleware/requireUser.js'
import { deletePhotos, deleteUnusedPhotos, isUserPhotoUrl, uploadPhoto } from '../lib/cloudinary.js'
import { detectItems } from '../lib/detectItems.js'
import { cropBox, hasArea, uprightJpeg } from '../lib/photoCrops.js'
import { isOnLoan, loanedItemIds, withAvailability } from '../lib/availability.js'
import { publicOwner } from '../lib/publicProfile.js'
import { reputationsByUser } from '../lib/reputation.js'

// Owner can't be changed
const editableFields = ['name', 'description', 'category', 'condition', 'photos']

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

async function draftItem(image, detectedItem, userId) {
  const crop = await cropBox(image, detectedItem.box_2d)
  const photoUrl = await uploadPhoto(crop, userId)
  return {
    name: detectedItem.name,
    description: detectedItem.description,
    category: detectedItem.category,
    condition: detectedItem.condition,
    photos: [photoUrl],
  }
}

// Drafts items from a room photo, the user sends the ones they keep to POST items
router.post('/detect', async (req, res) => {
  const photoUrl = req.body?.photoUrl
  if (!isUserPhotoUrl(photoUrl, req.userId)) {
    return res.status(400).json({ message: 'photoUrl must be a photo you uploaded', data: {} })
  }
  const response = await fetch(photoUrl)
  if (!response.ok) {
    return res.status(400).json({ message: "Couldn't download the photo", data: {} })
  }
  const image = await uprightJpeg(Buffer.from(await response.arrayBuffer()))
  // The room photo is only needed for this request
  await deleteUnusedPhotos([photoUrl])
  let detectedItems
  try {
    detectedItems = await detectItems(image)
  } catch (err) {
    // Gemini caps requests per day for the whole project
    if (err.status === 429) {
      return res
        .status(429)
        .json({ message: 'Item detection is used up for today, try again tomorrow', data: {} })
    }
    // Drop Gemini's status so the error handler sends a 500 instead of passing it on
    throw new Error('Gemini request failed', { cause: err })
  }
  const boxedItems = detectedItems.filter((item) => hasArea(item.box_2d))
  const drafts = await Promise.all(boxedItems.map((item) => draftItem(image, item, req.userId)))
  res.json({ message: 'OK', data: drafts })
})

// No owner filter needed since only the owner's items hold photos from their folder
async function isPhotoInUse(photos, user) {
  return photos.includes(user.photo) || Boolean(await Item.exists({ photos: { $in: photos } }))
}

// Deletes the crops of drafts the user didn't keep
router.post('/detect/discard', async (req, res) => {
  const photos = req.body?.photos
  if (!Array.isArray(photos) || !photos.every((url) => isUserPhotoUrl(url, req.userId))) {
    return res.status(400).json({ message: 'photos must be photos you uploaded', data: {} })
  }
  if (await isPhotoInUse(photos, req.user)) {
    return res
      .status(409)
      .json({ message: 'Some photos belong to an item or your profile', data: {} })
  }
  await deletePhotos(photos)
  res.status(204).end()
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

// A multiple of the 3, 2 and 1 column grids so every page fills whole rows
const BROWSE_PAGE_SIZE = 12

// A repeated query param arrives as an array, a single one as a string
function listParam(value) {
  if (value === undefined) {
    return []
  }
  return [].concat(value)
}

// Lent items are left out since nobody can borrow them right now
async function browseFilter(userId, query) {
  const loanedIds = await Loan.distinct('item', { status: { $in: ACTIVE_STATUSES } })
  const filter = { owner: { $ne: userId }, deletedAt: null, _id: { $nin: loanedIds } }
  const text = typeof query.q === 'string' ? query.q.trim() : ''
  if (text) {
    // Escape so characters like "." or "(" match themselves
    const pattern = new RegExp(RegExp.escape(text), 'i')
    filter.$or = [{ name: pattern }, { description: pattern }]
  }
  const categories = listParam(query.category)
  if (categories.length) {
    // Older items have no category stored and read back as the default Other
    const storedCategories = categories.includes('Other') ? [...categories, null] : categories
    filter.category = { $in: storedCategories }
  }
  const areas = listParam(query.area)
  if (areas.length) {
    const ownerIds = await User.distinct('_id', { campusArea: { $in: areas } })
    filter.owner.$in = ownerIds
  }
  return filter
}

// Registered before /:id so "browse" isn't read as an item id
router.get('/browse', async (req, res) => {
  const skip = Number(req.query.skip ?? 0)
  if (!Number.isInteger(skip) || skip < 0) {
    return res.status(400).json({ message: 'skip must be a whole number', data: {} })
  }
  const filter = await browseFilter(req.user._id, req.query)
  const [items, total] = await Promise.all([
    Item.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(BROWSE_PAGE_SIZE)
      .populate('owner', 'username displayName photo campusArea preferences.showProfile'),
    Item.countDocuments(filter),
  ])
  // Skip items whose owner profile was deleted by hand in the database
  const ownedItems = items.filter((item) => item.owner)
  const reputations = await reputationsByUser(ownedItems.map((item) => item.owner._id))
  const browseItems = []
  for (const item of ownedItems) {
    const reputation = reputations.get(item.owner.id) ?? null
    browseItems.push({
      ...withAvailability(item, true),
      owner: publicOwner(item.owner, reputation),
    })
  }
  res.json({ message: 'OK', data: { items: browseItems, total } })
})

router.get('/:id', async (req, res) => {
  res.json({ message: 'OK', data: withAvailability(req.item, !(await isOnLoan(req.item._id))) })
})

router.patch('/:id', requireOwner, async (req, res) => {
  const body = req.body ?? {}
  // The borrower took it in the condition it had when the loan started
  const changesCondition = body.condition !== undefined && body.condition !== req.item.condition
  if (changesCondition && (await isOnLoan(req.item._id))) {
    return res
      .status(409)
      .json({ message: "Can't change the condition while it's on loan", data: {} })
  }
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
