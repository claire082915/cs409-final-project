import Loan from '../models/loan.js'
import { reputationsByUser } from './reputation.js'

export async function trustByUser(userIds, reputations) {
  const [results, ratings] = await Promise.all([
    Loan.aggregate([
      {
        $match: {
          borrower: { $in: userIds },
          status: 'confirmed',
        },
      },
      {
        $group: {
          _id: '$borrower',
          completed: { $sum: 1 },
          onTime: { $sum: { $cond: [{ $lte: ['$returnedAt', '$dueDate'] }, 1, 0] } },
        },
      },
    ]),
    reputations ?? reputationsByUser(userIds),
  ])

  const trusts = new Map()
  for (const { _id, completed, onTime } of results) {
    const rating = ratings.get(String(_id))
    const goodRating = !rating || rating.average >= 4
    if (completed >= 3 && onTime / completed >= 0.8 && goodRating) {
      trusts.set(String(_id), 'trusted')
    } else {
      trusts.set(String(_id), 'standard')
    }
  }
  return trusts
}
