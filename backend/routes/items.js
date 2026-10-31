import { Router } from 'express'
import Item from '../models/item.js'
import requireUser from '../middleware/requireUser.js'

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

router.post('/', async (req, res) => {
  // Body is undefined when none is sent
  const { name, description, photos } = req.body ?? {}
  const item = await Item.create({ name, description, photos, owner: req.userId })
  res.status(201).json(item)
})

router.get('/:id', (req, res) => {
  res.json(req.item)
})

router.patch('/:id', requireOwner, async (req, res) => {
  const body = req.body ?? {}
  for (const field of editableFields) {
    if (body[field] !== undefined) {
      req.item[field] = body[field]
    }
  }
  await req.item.save()
  res.json(req.item)
})

// TODO: Block this while the item is on loan once loans exist
router.delete('/:id', requireOwner, async (req, res) => {
  await req.item.deleteOne()
  res.status(204).end()
})

export default router
