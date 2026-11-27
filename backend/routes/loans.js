import mongoose from 'mongoose'
import Item from '../models/item.js'
import Loan from '../models/loan.js'
import { Router } from 'express'
import requireUser from '../middleware/requireUser.js'
import Rating from '../models/rating.js'
import { isDuplicateKeyError } from '../lib/duplicateKey.js'
import { isOnLoan, loanedItemIds } from '../lib/availability.js'
import { reputationsByUser } from '../lib/reputation.js'
import { trustByUser } from '../lib/trust.js'
import { approveTrustedRequests, autoApproves, requestsToAutoApprove } from '../lib/autoApprove.js'
import { DUE_SOON_DAYS, MS_PER_DAY } from '../lib/notify.js'
// Read routes show the item and both users instead of bare ids
const loanDetails = [
  { path: 'item', select: 'name description category condition photos deletedAt' },
  { path: 'owner', select: 'username displayName photo campusArea' },
  { path: 'borrower', select: 'username displayName photo' },
]

const router = Router()
router.use(requireUser)

router.param('id', async (req, res, next, id) => {
  req.loan = mongoose.isObjectIdOrHexString(id) ? await Loan.findById(id) : null
  if (!req.loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  next()
})

// Request a loan (POST /api/loans)
const loansRoute = router.route('/')
// List loans you lent (GET /api/loans/lent)
const lentRoute = router.route('/lent')
// List loans you borrowed (GET /api/loans/borrowed)
const borrowedRoute = router.route('/borrowed')
// List borrowed loans that are overdue or due soon (GET /api/loans/reminders)
const remindersRoute = router.route('/reminders')
// Count requests and loans waiting on you (GET /api/loans/pending)
const pendingRoute = router.route('/pending')
// Count the waiting requests turning on auto-approve would approve (GET /api/loans/auto-approvable)
const autoApprovableRoute = router.route('/auto-approvable')
// View a loan (GET /api/loans/:id)
const loansIdRoute = router.route('/:id')
// Approve a loan (PATCH /api/loans/:id/approve)
const approveRoute = router.route('/:id/approve')
// Return a loan (PATCH /api/loans/:id/return)
const returnRoute = router.route('/:id/return')
// Confirm return of loaned item (PATCH /api/loans/:id/confirm)
const confirmRoute = router.route('/:id/confirm')
// Reject a request (PATCH /api/loans/:id/reject)
const rejectRoute = router.route('/:id/reject')
// Withdraw a request (PATCH /api/loans/:id/cancel)
const cancelRoute = router.route('/:id/cancel')
// Rate the other person on a loan (POST) or see your own rating (GET) (/api/loans/:id/ratings)
const ratingsRoute = router.route('/:id/ratings')

function statusFilter(status) {
  const currDate = new Date()
  if (status === undefined) {
    return {}
  }
  if (status === 'requested') {
    return { status: 'requested' }
  }
  if (status === 'active') {
    return { status: 'approved', dueDate: { $gte: currDate } }
  }
  if (status === 'overdue') {
    return { status: 'approved', dueDate: { $lt: currDate } }
  }
  if (status === 'due-soon') {
    const cutoff = new Date(currDate.getTime() + DUE_SOON_DAYS * MS_PER_DAY)
    return { status: 'approved', dueDate: { $gte: currDate, $lte: cutoff } }
  }
  if (status === 'returned') {
    return { status: { $in: ['returned', 'confirmed'] } }
  }
  if (status === 'rejected') {
    return { status: 'rejected' }
  }
  if (status === 'cancelled') {
    return { status: 'cancelled' }
  }
  return null
}

loansRoute.post(async function (req, res) {
  const body = req.body ?? {}

  // Missing or invalid itemId -> 400
  if (!mongoose.isObjectIdOrHexString(body.itemId)) {
    return res.status(400).json({ message: 'Missing or invalid itemId', data: {} })
  }
  // Missing, invalid, or past dueDate -> 400
  if (
    !body.dueDate ||
    isNaN(new Date(body.dueDate).getTime()) ||
    new Date(body.dueDate) <= new Date()
  ) {
    return res.status(400).json({ message: 'dueDate must be a valid future date', data: {} })
  }

  // Item does not exist -> 404
  const item = await Item.findOne({ _id: body.itemId, deletedAt: null })
  if (!item) {
    return res.status(404).json({ message: 'Item not found', data: {} })
  }
  // Borrowing your own item -> 400
  if (item.owner.equals(req.userId)) {
    return res.status(400).json({ message: "You can't borrow your own item", data: {} })
  }
  // Item is out on loan or returned but not confirmed yet -> 409
  if (await isOnLoan(item._id)) {
    return res.status(409).json({ message: 'Item is already on loan', data: {} })
  }

  // This user already has a pending request for the item -> 409
  if (await Loan.exists({ item: item._id, borrower: req.userId, status: 'requested' })) {
    return res.status(409).json({ message: 'You already requested this item', data: {} })
  }

  // Create a new loan. Respond with details of new loan
  let newLoan
  try {
    newLoan = await Loan.create({
      item: item._id,
      owner: item.owner,
      borrower: req.userId,
      dueDate: body.dueDate,
      message: body.message,
    })
  } catch (err) {
    // A second request from this user landed after the check above
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'You already requested this item', data: {} })
    }
    throw err
  }
  if (await autoApproves(item.owner)) {
    await approveTrustedRequests(item.owner, [item._id])
    newLoan = await Loan.findById(newLoan._id)
  }
  return res.status(201).json({ message: 'OK', data: newLoan })
})

// Requests can wait while their item is lent, so lists say whether it's available
async function withItemAvailability(loans) {
  const loanedIds = await loanedItemIds(loans.map((loan) => loan.item._id))
  const loansWithAvailability = []
  for (const loan of loans) {
    const json = loan.toJSON()
    json.item.available = !loanedIds.has(String(loan.item._id))
    loansWithAvailability.push(json)
  }
  return loansWithAvailability
}

lentRoute.get(async function (req, res) {
  const filter = statusFilter(req.query.status)
  if (!filter) {
    return res.status(400).json({ message: 'Invalid status filter', data: {} })
  }
  filter.owner = req.userId
  const loans = await Loan.find(filter).sort({ createdAt: -1 }).populate(loanDetails)

  // Owners see each borrower's rating so they can decide on a request
  const borrowerIds = loans.map((loan) => loan.borrower._id)
  const [reputations, trusts] = await Promise.all([
    reputationsByUser(borrowerIds),
    trustByUser(borrowerIds),
  ])
  const loansWithDetails = await withItemAvailability(loans)
  for (const loan of loansWithDetails) {
    loan.borrower.reputation = reputations.get(String(loan.borrower._id)) ?? null
    loan.borrower.trust = trusts.get(String(loan.borrower._id)) ?? 'new'
  }
  return res.status(200).json({ message: 'OK', data: loansWithDetails })
})

borrowedRoute.get(async function (req, res) {
  const filter = statusFilter(req.query.status)
  if (!filter) {
    return res.status(400).json({ message: 'Invalid status filter', data: {} })
  }
  filter.borrower = req.userId
  const loans = await Loan.find(filter).sort({ createdAt: -1 }).populate(loanDetails)
  return res.status(200).json({ message: 'OK', data: await withItemAvailability(loans) })
})

// Soonest due first, since these are the ones to return next
async function borrowedLoansSortedByDueDate(userId, status) {
  return Loan.find({ ...statusFilter(status), borrower: userId })
    .sort({ dueDate: 1 })
    .populate(loanDetails)
}

remindersRoute.get(async function (req, res) {
  const [overdue, dueSoon] = await Promise.all([
    borrowedLoansSortedByDueDate(req.userId, 'overdue'),
    borrowedLoansSortedByDueDate(req.userId, 'due-soon'),
  ])
  return res.status(200).json({ message: 'OK', data: { overdue, dueSoon } })
})

pendingRoute.get(async function (req, res) {
  const [requests, returns, overdue] = await Promise.all([
    Loan.countDocuments({ owner: req.userId, status: 'requested' }),
    Loan.countDocuments({ owner: req.userId, status: 'returned' }),
    Loan.countDocuments({ ...statusFilter('overdue'), borrower: req.userId }),
  ])
  return res.status(200).json({ message: 'OK', data: { requests, loans: returns + overdue } })
})

autoApprovableRoute.get(async function (req, res) {
  const itemIds = await Loan.distinct('item', { owner: req.userId, status: 'requested' })
  const requests = await requestsToAutoApprove(req.userId, itemIds)
  return res.status(200).json({ message: 'OK', data: { count: requests.length } })
})

loansIdRoute.get(async function (req, res) {
  // Only the owner or the borrower can view -> 403
  if (!req.loan.owner.equals(req.userId) && !req.loan.borrower.equals(req.userId)) {
    return res
      .status(403)
      .json({ message: 'Only the owner or borrower can view this loan', data: {} })
  }
  // Populate after the check above, which compares the bare user ids
  await req.loan.populate(loanDetails)
  return res.status(200).json({ message: 'OK', data: req.loan })
})

approveRoute.patch(async function (req, res) {
  // Only the owner can approve -> 403
  if (!req.loan.owner.equals(req.userId)) {
    return res.status(403).json({ message: 'Only the item owner can approve', data: {} })
  }

  // Loan is not awaiting approval -> 409
  if (req.loan.status !== 'requested') {
    return res.status(409).json({ message: 'Loan is not awaiting approval', data: {} })
  }
  // The owner may adjust the proposed return date while approving.
  const body = req.body ?? {}
  if (body.dueDate !== undefined) {
    if (
      !body.dueDate ||
      isNaN(new Date(body.dueDate).getTime()) ||
      new Date(body.dueDate) <= new Date()
    ) {
      return res.status(400).json({ message: 'dueDate must be a valid future date', data: {} })
    }
    req.loan.dueDate = body.dueDate
  }

  // Due date passed while the request was waiting -> 409
  if (req.loan.dueDate <= new Date()) {
    return res.status(409).json({ message: 'Due date has already passed', data: {} })
  }
  // Item went out on another loan in the meantime -> 409
  if (await isOnLoan(req.loan.item)) {
    return res.status(409).json({ message: 'Item is already on loan', data: {} })
  }
  // Owner deleted the item after this request was made -> 409
  if (!(await Item.exists({ _id: req.loan.item, deletedAt: null }))) {
    return res.status(409).json({ message: 'Item was deleted', data: {} })
  }

  req.loan.status = 'approved'
  req.loan.approvedAt = new Date()
  try {
    await req.loan.save()
  } catch (err) {
    // Another request for this item was approved after the checks above
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'Item is already on loan', data: {} })
    }
    throw err
  }
  return res.status(200).json({ message: 'OK', data: req.loan })
})

returnRoute.patch(async function (req, res) {
  // Only the borrower can return -> 403
  if (!req.loan.borrower.equals(req.userId)) {
    return res.status(403).json({ message: 'Only the borrower can return', data: {} })
  }
  // Loan is not approved -> 409
  if (req.loan.status !== 'approved') {
    return res.status(409).json({ message: 'Loan is not approved', data: {} })
  }
  // No photo of the item -> 400
  if (!req.body?.photo) {
    return res.status(400).json({ message: 'Add a photo of the item to return it', data: {} })
  }

  req.loan.status = 'returned'
  req.loan.returnedAt = new Date()
  req.loan.returnPhoto = req.body.photo
  await req.loan.save()
  return res.status(200).json({ message: 'OK', data: req.loan })
})

confirmRoute.patch(async function (req, res) {
  // Only the owner can confirm -> 403
  if (!req.loan.owner.equals(req.userId)) {
    return res.status(403).json({ message: 'Only the item owner can confirm', data: {} })
  }
  // Borrower has not returned the item yet -> 409
  if (req.loan.status !== 'returned') {
    return res.status(409).json({ message: 'Borrower has not returned this item yet', data: {} })
  }

  req.loan.status = 'confirmed'
  req.loan.confirmedAt = new Date()
  await req.loan.save()
  // The item is free again, so the next trusted request can have it
  if (req.user.preferences.autoApprove) {
    await approveTrustedRequests(req.userId, [req.loan.item])
  }
  return res.status(200).json({ message: 'OK', data: req.loan })
})

rejectRoute.patch(async function (req, res) {
  // Only the owner can reject -> 403
  if (!req.loan.owner.equals(req.userId)) {
    return res.status(403).json({ message: 'Only the item owner can reject', data: {} })
  }
  // Loan is not awaiting approval -> 409
  if (req.loan.status !== 'requested') {
    return res.status(409).json({ message: 'Loan is not awaiting approval', data: {} })
  }

  req.loan.status = 'rejected'
  await req.loan.save()
  return res.status(200).json({ message: 'OK', data: req.loan })
})

cancelRoute.patch(async function (req, res) {
  // Only the borrower can cancel -> 403
  if (!req.loan.borrower.equals(req.userId)) {
    return res.status(403).json({ message: 'Only the borrower can cancel', data: {} })
  }
  // Loan was already approved or finished -> 409
  if (req.loan.status !== 'requested') {
    return res.status(409).json({ message: 'Only a pending request can be cancelled', data: {} })
  }

  req.loan.status = 'cancelled'
  await req.loan.save()
  return res.status(200).json({ message: 'OK', data: req.loan })
})

ratingsRoute.post(async function (req, res) {
  const body = req.body ?? {}

  const isOwner = req.loan.owner.equals(req.userId)
  const isBorrower = req.loan.borrower.equals(req.userId)
  if (!isOwner && !isBorrower) {
    return res.status(403).json({ message: 'Only the owner or borrower can rate', data: {} })
  }

  if (req.loan.status !== 'confirmed') {
    return res.status(409).json({ message: 'Loan is not confirmed yet', data: {} })
  }

  // score must be from 1 to 5 -> 400
  if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) {
    return res.status(400).json({ message: 'score must be from 1 to 5', data: {} })
  }

  // Already rated this loan -> 409
  if (await Rating.exists({ loan: req.loan._id, rater: req.userId })) {
    return res.status(409).json({ message: 'You already rated this loan', data: {} })
  }

  let ratee = null
  if (isOwner) {
    ratee = req.loan.borrower
  } else {
    ratee = req.loan.owner
  }
  let newRating
  try {
    newRating = await Rating.create({
      loan: req.loan._id,
      rater: req.userId,
      ratee: ratee,
      score: body.score,
    })
  } catch (err) {
    // A second rating from this user landed after the check above
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'You already rated this loan', data: {} })
    }
    throw err
  }

  return res.status(201).json({ message: 'OK', data: newRating })
})

ratingsRoute.get(async function (req, res) {
  if (!req.loan.owner.equals(req.userId) && !req.loan.borrower.equals(req.userId)) {
    return res
      .status(403)
      .json({ message: 'Only the owner or borrower can view ratings', data: {} })
  }
  // Null until the caller rates this loan
  const rating = await Rating.findOne({ loan: req.loan._id, rater: req.userId })
  return res.status(200).json({ message: 'OK', data: rating })
})

export default router
