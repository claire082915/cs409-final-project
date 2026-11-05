import Loan, { ACTIVE_STATUSES } from '../models/loan.js'

export async function isOnLoan(itemId) {
  return Boolean(await Loan.exists({ item: itemId, status: { $in: ACTIVE_STATUSES } }))
}

// Ids as strings so they can be matched against item.id
export async function loanedItemIds(itemIds) {
  const loanedIds = await Loan.distinct('item', {
    item: { $in: itemIds },
    status: { $in: ACTIVE_STATUSES },
  })
  return new Set(loanedIds.map(String))
}

export function withAvailability(item, available) {
  return { ...item.toJSON(), available }
}
