import mongoose from 'mongoose'
import { Router } from 'express'
import requireUser from '../middleware/requireUser.js'
import Notification from '../models/notification.js'
import { createDueReminders } from '../lib/notify.js'

// Older ones stay in the database but drop off the list, picked by hand
const LIST_LIMIT = 20

const router = Router()
router.use(requireUser)

// List your notifications, newest first (GET /api/notifications)
router.get('/', async (req, res) => {
  await createDueReminders(req.userId)
  const notifications = await Notification.find({ user: req.userId, dismissed: false })
    .sort({ createdAt: -1 })
    .limit(LIST_LIMIT)
  res.json({ message: 'OK', data: notifications })
})

// Mark all your notifications read (PATCH /api/notifications/read)
router.patch('/read', async (req, res) => {
  await Notification.updateMany({ user: req.userId, read: false }, { read: true })
  res.status(204).end()
})

// Dismiss all your notifications (DELETE /api/notifications)
router.delete('/', async (req, res) => {
  await Notification.updateMany({ user: req.userId, dismissed: false }, { dismissed: true })
  res.status(204).end()
})

// Dismiss one notification (DELETE /api/notifications/:id)
router.delete('/:id', async (req, res) => {
  const notFound = { message: 'Notification not found', data: {} }
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json(notFound)
  }
  const filter = { _id: req.params.id, user: req.userId }
  const result = await Notification.updateOne(filter, { dismissed: true })
  if (result.matchedCount === 0) {
    return res.status(404).json(notFound)
  }
  res.status(204).end()
})

export default router
