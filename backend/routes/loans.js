import mongoose from 'mongoose'
import Item from '../models/item.js'
import Loan from '../models/loan.js'
import { Router } from 'express'
import requireUser from '../middleware/requireUser.js'
import Rating from '../models/rating.js'
import { isDuplicateKeyError } from '../lib/duplicateKey.js'

// Loans due within this many days count as due soon
const dueSoonDays = 3
const msPerDay = 24 * 60 * 60 * 1000

const router = Router()
router.use(requireUser)

// Request a loan (POST /api/loans)
const loansRoute = router.route('/')
// List loans you lent (GET /api/loans/lent)
const lentRoute = router.route('/lent')
// List loans you borrowed (GET /api/loans/borrowed)
const borrowedRoute = router.route('/borrowed')
// List borrowed loans that are overdue or due soon (GET /api/loans/reminders)
const remindersRoute = router.route('/reminders')
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
    const cutoff = new Date(currDate.getTime() + dueSoonDays * msPerDay)
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
  const item = await Item.findById(body.itemId)
  if (!item) {
    return res.status(404).json({ message: 'Item not found', data: {} })
  }
  // Borrowing your own item -> 400
  if (String(item.owner) === String(req.userId)) {
    return res.status(400).json({ message: "You can't borrow your own item", data: {} })
  }
  // Item is already out on loan -> 409
  if (await Loan.exists({ item: item._id, status: 'approved' })) {
    return res.status(409).json({ message: 'Item is already on loan', data: {} })
  }
  // Item was returned but the owner hasn't confirmed yet -> 409
  if (await Loan.exists({ item: item._id, status: 'returned' })) {
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
    })
  } catch (err) {
    // A second request from this user landed after the check above
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'You already requested this item', data: {} })
    }
    throw err
  }
  return res.status(201).json({ message: 'OK', data: newLoan })
})

lentRoute.get(async function (req, res) {
  const filter = statusFilter(req.query.status)
  if (!filter) {
    return res.status(400).json({ message: 'Invalid status filter', data: {} })
  }
  filter.owner = req.userId
  const loans = await Loan.find(filter)
    .sort({ createdAt: -1 })
    .populate('item', 'name description photos')

  return res.status(200).json({ message: 'OK', data: loans })
})

borrowedRoute.get(async function (req, res) {
  const filter = statusFilter(req.query.status)
  if (!filter) {
    return res.status(400).json({ message: 'Invalid status filter', data: {} })
  }
  filter.borrower = req.userId
  const loans = await Loan.find(filter)
    .sort({ createdAt: -1 })
    .populate('item', 'name description photos')
  return res.status(200).json({ message: 'OK', data: loans })
})

// Soonest due first, since these are the ones to return next
async function borrowedLoansSortedByDueDate(userId, status) {
  return Loan.find({ ...statusFilter(status), borrower: userId })
    .sort({ dueDate: 1 })
    .populate('item', 'name description photos')
}

remindersRoute.get(async function (req, res) {
  const [overdue, dueSoon] = await Promise.all([
    borrowedLoansSortedByDueDate(req.userId, 'overdue'),
    borrowedLoansSortedByDueDate(req.userId, 'due-soon'),
  ])
  return res.status(200).json({ message: 'OK', data: { overdue, dueSoon } })
})

loansIdRoute.get(async function (req, res) {
  // URL id is not a valid id -> 404
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  const loan = await Loan.findById(req.params.id).populate('item', 'name description photos')
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  // Only the owner or the borrower can view -> 403
  if (String(loan.owner) !== String(req.userId) && String(loan.borrower) !== String(req.userId)) {
    return res
      .status(403)
      .json({ message: 'Only the owner or borrower can view this loan', data: {} })
  }
  return res.status(200).json({ message: 'OK', data: loan })
})

approveRoute.patch(async function (req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  const loan = await Loan.findById(req.params.id)
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  // Only the owner can approve -> 403
  if (String(loan.owner) !== String(req.userId)) {
    return res.status(403).json({ message: 'Only the item owner can approve', data: {} })
  }

  // Loan is not awaiting approval -> 409
  if (loan.status !== 'requested') {
    return res.status(409).json({ message: 'Loan is not awaiting approval', data: {} })
  }
  // Item went out on another loan in the meantime -> 409
  if (await Loan.exists({ item: loan.item, status: 'approved' })) {
    return res.status(409).json({ message: 'Item is already on loan', data: {} })
  }
  // Item was returned but not confirmed yet -> 409
  if (await Loan.exists({ item: loan.item, status: 'returned' })) {
    return res.status(409).json({ message: 'Item is already on loan', data: {} })
  }

  loan.status = 'approved'
  loan.approvedAt = new Date()
  try {
    await loan.save()
  } catch (err) {
    // Another request for this item was approved after the checks above
    if (isDuplicateKeyError(err)) {
      return res.status(409).json({ message: 'Item is already on loan', data: {} })
    }
    throw err
  }
  return res.status(200).json({ message: 'OK', data: loan })
})

returnRoute.patch(async function (req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  const loan = await Loan.findById(req.params.id)
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  // Only the borrower can return -> 403
  if (String(loan.borrower) !== String(req.userId)) {
    return res.status(403).json({ message: 'Only the borrower can return', data: {} })
  }
  // Loan is not approved -> 409
  if (loan.status !== 'approved') {
    return res.status(409).json({ message: 'Loan is not approved', data: {} })
  }

  loan.status = 'returned'
  loan.returnedAt = new Date()
  await loan.save()
  return res.status(200).json({ message: 'OK', data: loan })
})

confirmRoute.patch(async function (req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  const loan = await Loan.findById(req.params.id)
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  // Only the owner can confirm -> 403
  if (String(loan.owner) !== String(req.userId)) {
    return res.status(403).json({ message: 'Only the item owner can confirm', data: {} })
  }
  // Borrower has not returned the item yet -> 409
  if (loan.status !== 'returned') {
    return res.status(409).json({ message: 'Borrower has not returned this item yet', data: {} })
  }

  loan.status = 'confirmed'
  loan.confirmedAt = new Date()
  await loan.save()
  return res.status(200).json({ message: 'OK', data: loan })
})

rejectRoute.patch(async function (req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  const loan = await Loan.findById(req.params.id)
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  // Only the owner can reject -> 403
  if (String(loan.owner) !== String(req.userId)) {
    return res.status(403).json({ message: 'Only the item owner can reject', data: {} })
  }
  // Loan is not awaiting approval -> 409
  if (loan.status !== 'requested') {
    return res.status(409).json({ message: 'Loan is not awaiting approval', data: {} })
  }

  loan.status = 'rejected'
  await loan.save()
  return res.status(200).json({ message: 'OK', data: loan })
})

cancelRoute.patch(async function (req, res) {
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  const loan = await Loan.findById(req.params.id)
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }
  // Only the borrower can cancel -> 403
  if (String(loan.borrower) !== String(req.userId)) {
    return res.status(403).json({ message: 'Only the borrower can cancel', data: {} })
  }
  // Loan was already approved or finished -> 409
  if (loan.status !== 'requested') {
    return res.status(409).json({ message: 'Only a pending request can be cancelled', data: {} })
  }

  loan.status = 'cancelled'
  await loan.save()
  return res.status(200).json({ message: 'OK', data: loan })
})

ratingsRoute.post(async function (req, res) {
  const body = req.body ?? {}

  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  const loan = await Loan.findById(req.params.id)
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  const isOwner = String(loan.owner) === String(req.userId)
  const isBorrower = String(loan.borrower) === String(req.userId)
  if (!isOwner && !isBorrower) {
    return res.status(403).json({ message: 'Only the owner or borrower can rate', data: {} })
  }

  if (loan.status !== 'confirmed') {
    return res.status(409).json({ message: 'Loan is not confirmed yet', data: {} })
  }

  // score must be from 1 to 5 -> 400
  if (!Number.isInteger(body.score) || body.score < 1 || body.score > 5) {
    return res.status(400).json({ message: 'score must be from 1 to 5', data: {} })
  }

  // Already rated this loan -> 409
  if (await Rating.exists({ loan: loan._id, rater: req.userId })) {
    return res.status(409).json({ message: 'You already rated this loan', data: {} })
  }

  let ratee = null
  if (isOwner) {
    ratee = loan.borrower
  } else {
    ratee = loan.owner
  }
  let newRating
  try {
    newRating = await Rating.create({
      loan: loan._id,
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
  if (!mongoose.isObjectIdOrHexString(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  const loan = await Loan.findById(req.params.id)
  if (!loan) {
    return res.status(404).json({ message: 'Loan not found', data: {} })
  }

  if (String(loan.owner) !== String(req.userId) && String(loan.borrower) !== String(req.userId)) {
    return res
      .status(403)
      .json({ message: 'Only the owner or borrower can view ratings', data: {} })
  }
  const ratings = await Rating.find({ loan: loan._id, rater: req.userId })

  return res.status(200).json({ message: 'OK', data: ratings })
})

export default router
