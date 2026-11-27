import Item from '../models/item.js'
import Loan from '../models/loan.js'
import User from '../models/user.js'
import { loanedItemIds } from './availability.js'
import { isDuplicateKeyError } from './duplicateKey.js'
import { trustByUser } from './trust.js'
import { notifyLoan } from './notify.js'
import { campusToday } from './dueDate.js'

export async function autoApproves(ownerId) {
  return Boolean(await User.exists({ _id: ownerId, 'preferences.autoApprove': true }))
}

// The earliest trusted request on each free item, the rest stay pending for the owner
export async function requestsToAutoApprove(ownerId, itemIds) {
  const requests = await Loan.find({
    owner: ownerId,
    item: { $in: itemIds },
    status: 'requested',
    dueDate: { $gte: campusToday() },
  }).sort({ createdAt: 1 })
  const [trusts, loanedIds, liveItemIds] = await Promise.all([
    trustByUser(requests.map((request) => request.borrower)),
    loanedItemIds(itemIds),
    Item.distinct('_id', { _id: { $in: itemIds }, deletedAt: null }),
  ])
  const liveIds = new Set(liveItemIds.map(String))

  const chosen = []
  for (const request of requests) {
    const itemId = String(request.item)
    if (trusts.get(String(request.borrower)) !== 'trusted') {
      continue
    }
    if (loanedIds.has(itemId) || !liveIds.has(itemId)) {
      continue
    }
    chosen.push(request)
    loanedIds.add(itemId)
  }
  return chosen
}

export async function approveTrustedRequests(ownerId, itemIds) {
  const approved = []
  for (const request of await requestsToAutoApprove(ownerId, itemIds)) {
    request.status = 'approved'
    request.approvedAt = new Date()
    try {
      await request.save()
      await notifyLoan(request._id, 'auto-approved')
      approved.push(request)
    } catch (err) {
      // The owner approved another request for this item at the same moment
      if (!isDuplicateKeyError(err)) {
        throw err
      }
    }
  }
  return approved
}
