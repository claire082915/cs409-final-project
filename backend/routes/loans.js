import mongoose from 'mongoose'
import Item from '../models/item.js'
import Loan from '../models/loan.js'
import { Router } from 'express'
import requireUser from '../middleware/requireUser.js'

const router = Router()
router.use(requireUser)

// Request a loan (POST /api/loans)
const loansRoute = router.route('/')
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

loansRoute.post(async function (req, res) {
  const body = req.body ?? {}

  // Missing or invalid itemId -> 400
  if (!mongoose.isValidObjectId(body.itemId)) {
    return res.status(400).json({ message: 'Missing or invalid itemId.', data: {} })
  }
  // Missing, invalid, or past dueDate -> 400
  if (
    !body.dueDate ||
    isNaN(new Date(body.dueDate).getTime()) ||
    new Date(body.dueDate) <= new Date()
  ) {
    return res.status(400).json({ message: 'dueDate must be a valid future date.', data: {} })
  }

  try {
    // Item does not exist -> 404
    const item = await Item.findById(body.itemId)
    if (!item) {
      return res.status(404).json({ message: 'Item not found.', data: {} })
    }
    // Borrowing your own item -> 400
    if (String(item.owner) === String(req.userId)) {
      return res.status(400).json({ message: "You can't borrow your own item.", data: {} })
    }
    // Item is already out on loan -> 409
    if (await Loan.exists({ item: item._id, status: 'approved' })) {
      return res.status(409).json({ message: 'Item is already on loan.', data: {} })
    }
    // Item was returned but the owner hasn't confirmed yet -> 409
    if (await Loan.exists({ item: item._id, status: 'returned' })) {
      return res.status(409).json({ message: 'Item is already on loan.', data: {} })
    }

    // This user already has a pending request for the item -> 409
    if (await Loan.exists({ item: item._id, borrower: req.userId, status: 'requested' })) {
      return res.status(409).json({ message: 'You already requested this item.', data: {} })
    }

    // Create a new loan. Respond with details of new loan
    const newLoan = await Loan.create({
      item: item._id,
      owner: item.owner,
      borrower: req.userId,
      dueDate: body.dueDate,
    })
    return res.status(201).json({ message: 'Success: loans POST', data: newLoan })
  } catch (err) {
    return res.status(500).json({ message: 'Server error', data: {} })
  }
})

loansIdRoute.get(async function (req, res) {
  // URL id is not a valid id -> 404
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found.', data: {} })
  }

  try {
    const loan = await Loan.findById(req.params.id)
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.', data: {} })
    }

    // Only the owner or the borrower can view -> 403
    if (String(loan.owner) !== String(req.userId) && String(loan.borrower) !== String(req.userId)) {
      return res
        .status(403)
        .json({ message: 'Only the owner or borrower can view this loan.', data: {} })
    }
    return res.status(200).json({ message: 'Success: loans/:id GET', data: loan })
  } catch (err) {
    return res.status(500).json({ message: 'Server error', data: {} })
  }
})

approveRoute.patch(async function (req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found.', data: {} })
  }

  try {
    const loan = await Loan.findById(req.params.id)
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.', data: {} })
    }
    // Only the owner can approve -> 403
    if (String(loan.owner) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the item owner can approve.', data: {} })
    }

    // Loan is not awaiting approval -> 409
    if (loan.status !== 'requested') {
      return res.status(409).json({ message: 'Loan is not awaiting approval.', data: {} })
    }
    // Item went out on another loan in the meantime -> 409
    if (await Loan.exists({ item: loan.item, status: 'approved' })) {
      return res.status(409).json({ message: 'Item is already on loan.', data: {} })
    }
    // Item was returned but not confirmed yet -> 409
    if (await Loan.exists({ item: loan.item, status: 'returned' })) {
      return res.status(409).json({ message: 'Item is already on loan.', data: {} })
    }

    loan.status = 'approved'
    await loan.save()
    return res.status(200).json({ message: 'Success: loans/:id/approve PATCH', data: loan })
  } catch (err) {
    return res.status(500).json({ message: 'Server error', data: {} })
  }
})

returnRoute.patch(async function (req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found.', data: {} })
  }

  try {
    const loan = await Loan.findById(req.params.id)
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.', data: {} })
    }
    // Only the borrower can return -> 403
    if (String(loan.borrower) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the borrower can return.', data: {} })
    }
    // Loan is not approved -> 409
    if (loan.status !== 'approved') {
      return res.status(409).json({ message: 'Loan is not approved.', data: {} })
    }

    loan.status = 'returned'
    await loan.save()
    return res.status(200).json({ message: 'Success: loans/:id/return PATCH', data: loan })
  } catch (err) {
    return res.status(500).json({ message: 'Server error', data: {} })
  }
})

confirmRoute.patch(async function (req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found.', data: {} })
  }

  try {
    const loan = await Loan.findById(req.params.id)
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.', data: {} })
    }
    // Only the owner can confirm -> 403
    if (String(loan.owner) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the item owner can confirm.', data: {} })
    }
    // Borrower has not returned the item yet -> 409
    if (loan.status !== 'returned') {
      return res.status(409).json({ message: 'Borrower has not returned this item yet.', data: {} })
    }

    loan.status = 'confirmed'
    await loan.save()
    return res.status(200).json({ message: 'Success: loans/:id/confirm PATCH', data: loan })
  } catch (err) {
    return res.status(500).json({ message: 'Server error', data: {} })
  }
})

rejectRoute.patch(async function (req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found.', data: {} })
  }
  try {
    const loan = await Loan.findById(req.params.id)
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.', data: {} })
    }
    // Only the owner can reject -> 403
    if (String(loan.owner) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the item owner can reject.', data: {} })
    }
    // Loan is not awaiting approval -> 409
    if (loan.status !== 'requested') {
      return res.status(409).json({ message: 'Loan is not awaiting approval.', data: {} })
    }

    loan.status = 'rejected'
    await loan.save()
    return res.status(200).json({ message: 'Success: loans/:id/reject PATCH', data: loan })
  } catch (err) {
    return res.status(500).json({ message: 'Server error', data: {} })
  }
})

cancelRoute.patch(async function (req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: 'Loan not found.', data: {} })
  }
  try {
    const loan = await Loan.findById(req.params.id)
    if (!loan) {
      return res.status(404).json({ message: 'Loan not found.', data: {} })
    }
    // Only the borrower can cancel -> 403
    if (String(loan.borrower) !== String(req.userId)) {
      return res.status(403).json({ message: 'Only the borrower can cancel.', data: {} })
    }
    // Loan was already approved or finished -> 409
    if (loan.status !== 'requested') {
      return res.status(409).json({ message: 'Only a pending request can be cancelled.', data: {} })
    }

    loan.status = 'cancelled'
    await loan.save()
    return res.status(200).json({ message: 'Success: loans/:id/cancel PATCH', data: loan })
  } catch (err) {
    return res.status(500).json({ message: 'Server error', data: {} })
  }
})

export default router
