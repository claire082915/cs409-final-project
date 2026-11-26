import { Router } from 'express'
import Item from '../models/item.js'
import User from '../models/user.js'
import Loan from '../models/loan.js'
import requireUser, { requireIdToken } from '../middleware/requireUser.js'
import { loanedItemIds, withAvailability } from '../lib/availability.js'
import { reputation } from '../lib/reputation.js'
import { trustByUser } from '../lib/trust.js'
import { deleteUnusedPhotos } from '../lib/cloudinary.js'
import { demoUsernameError } from '../lib/demoAccount.js'
import { approveTrustedRequests } from '../lib/autoApprove.js'

const router = Router()
const editableFields = ['username', 'displayName', 'campusArea', 'photo']
const preferenceNames = [
  'borrowRequests',
  'requestUpdates',
  'returnUpdates',
  'dueDateReminders',
  'showProfile',
  'autoApprove',
]

// Copies the preferences that were sent, returns an error message when one isn't a boolean
function applyPreferences(user, preferences) {
  if (typeof preferences !== 'object' || preferences === null) {
    return 'preferences must be an object'
  }
  for (const name of preferenceNames) {
    if (preferences[name] === undefined) {
      continue
    }
    if (typeof preferences[name] !== 'boolean') {
      return `preferences.${name} must be true or false`
    }
    user.preferences[name] = preferences[name]
  }
  return null
}

// The signed in user's own profile, with their reputation so the Account page can show it
async function withReputation(user) {
  return { ...user.toJSON(), reputation: await reputation(user._id) }
}

// Called once after the first Firebase sign-in to pick a username
router.post('/', requireIdToken, async (req, res) => {
  const { username, displayName } = req.body ?? {}
  if (typeof username !== 'string' || typeof displayName !== 'string') {
    return res.status(400).json({ message: 'Username and display name are required', data: {} })
  }
  const usernameError = demoUsernameError(req.idToken.email, username)
  if (usernameError) {
    return res.status(400).json({ message: usernameError, data: {} })
  }
  if (await User.exists({ firebaseUid: req.idToken.uid })) {
    return res.status(409).json({ message: 'Profile already exists', data: {} })
  }
  const user = await User.create({
    firebaseUid: req.idToken.uid,
    email: req.idToken.email,
    username,
    displayName,
  })
  res.status(201).json({ message: 'OK', data: user })
})

router.get('/me', requireUser, async (req, res) => {
  res.json({ message: 'OK', data: await withReputation(req.user) })
})

// Email comes from Firebase, so it can't change here
router.patch('/me', requireUser, async (req, res) => {
  const body = req.body ?? {}
  const oldPhoto = req.user.photo
  const hadAutoApprove = req.user.preferences.autoApprove
  // Save always sends the username, so only a new one is checked
  const changesUsername = typeof body.username === 'string' && body.username !== req.user.username
  const usernameError = changesUsername && demoUsernameError(req.user.email, body.username)
  if (usernameError) {
    return res.status(400).json({ message: usernameError, data: {} })
  }
  for (const field of editableFields) {
    if (body[field] === undefined) {
      continue
    }
    if (typeof body[field] !== 'string') {
      return res.status(400).json({ message: `${field} must be a string`, data: {} })
    }
    req.user[field] = body[field]
  }
  if (body.preferences !== undefined) {
    const preferencesError = applyPreferences(req.user, body.preferences)
    if (preferencesError) {
      return res.status(400).json({ message: preferencesError, data: {} })
    }
  }
  await req.user.save()
  if (!hadAutoApprove && req.user.preferences.autoApprove) {
    const requestedItemIds = await Loan.distinct('item', {
      owner: req.user._id,
      status: 'requested',
    })
    await approveTrustedRequests(req.user._id, requestedItemIds)
  }
  // Delete the replaced or removed photo so it doesn't sit unused in Cloudinary
  if (oldPhoto && oldPhoto !== req.user.photo) {
    await deleteUnusedPhotos([oldPhoto])
  }
  res.json({ message: 'OK', data: await withReputation(req.user) })
})

router.get('/:username', requireUser, async (req, res) => {
  const user = await User.findOne({ username: req.params.username.toLowerCase() })
  // A hidden profile looks the same as a missing one to everyone but its owner
  const isHidden = user && !user._id.equals(req.userId) && !user.preferences.showProfile
  if (!user || isHidden) {
    return res.status(404).json({ message: 'User not found', data: {} })
  }
  const items = await Item.find({ owner: user._id, deletedAt: null }).sort({ createdAt: -1 })
  const loanedIds = await loanedItemIds(items.map((item) => item._id))
  const itemsWithAvailability = items.map((item) => withAvailability(item, !loanedIds.has(item.id)))
  // Only loans that came back count toward someone's lending record
  const finished = { $in: ['returned', 'confirmed'] }
  const [lentCount, borrowedCount, trusts] = await Promise.all([
    Loan.countDocuments({ owner: user._id, status: finished }),
    Loan.countDocuments({ borrower: user._id, status: finished }),
    trustByUser([user._id]),
  ])
  const profile = {
    username: user.username,
    displayName: user.displayName,
    photo: user.photo,
    campusArea: user.campusArea,
    joinedAt: user.createdAt,
    lentCount,
    borrowedCount,
    items: itemsWithAvailability,
    reputation: await reputation(user._id),
    trust: trusts.get(String(user._id)) ?? 'new',
  }
  res.json({ message: 'OK', data: profile })
})

export default router
