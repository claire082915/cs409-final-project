import Loan from '../models/loan.js'
import Rating from '../models/rating.js'
import { CAMPUS_TIME_ZONE } from './dueDate.js'

// Picked by hand
const MIN_RETURNS = 3
const MIN_ON_TIME_SHARE = 0.9
const MIN_AVERAGE_RATING = 4

// Only ratings from lenders, so ratings earned as a lender don't count
async function borrowerRatings(userIds) {
  const results = await Rating.aggregate([
    { $match: { ratee: { $in: userIds } } },
    { $lookup: { from: 'loans', localField: 'loan', foreignField: '_id', as: 'loan' } },
    { $unwind: '$loan' },
    { $match: { $expr: { $eq: ['$loan.borrower', '$ratee'] } } },
    { $group: { _id: '$ratee', average: { $avg: '$score' } } },
  ])
  const averages = new Map()
  for (const { _id, average } of results) {
    averages.set(String(_id), average)
  }
  return averages
}

// On time means returned by the end of the due day on campus, compared as YYYY-MM-DD
const returnDay = {
  $dateToString: { format: '%Y-%m-%d', date: '$returnedAt', timezone: CAMPUS_TIME_ZONE },
}
const dueDay = { $dateToString: { format: '%Y-%m-%d', date: '$dueDate' } }

export async function trustByUser(userIds) {
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
          onTime: { $sum: { $cond: [{ $lte: [returnDay, dueDay] }, 1, 0] } },
        },
      },
    ]),
    borrowerRatings(userIds),
  ])

  const trusts = new Map()
  for (const { _id, completed, onTime } of results) {
    // Unrated borrowers fail this since undefined >= 4 is false
    const goodRating = ratings.get(String(_id)) >= MIN_AVERAGE_RATING
    if (completed >= MIN_RETURNS && onTime / completed >= MIN_ON_TIME_SHARE && goodRating) {
      trusts.set(String(_id), 'trusted')
    } else {
      trusts.set(String(_id), 'standard')
    }
  }
  return trusts
}
