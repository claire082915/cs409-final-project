import Rating from '../models/rating.js'

// Average score and rating count keyed by user id, users nobody rated are missing
export async function reputationsByUser(userIds) {
  const results = await Rating.aggregate([
    { $match: { ratee: { $in: userIds } } },
    { $group: { _id: '$ratee', average: { $avg: '$score' }, count: { $sum: 1 } } },
  ])
  const reputations = new Map()
  for (const { _id, average, count } of results) {
    reputations.set(String(_id), { average, count })
  }
  return reputations
}

// Null when nobody has rated the user yet
export async function reputation(userId) {
  const reputations = await reputationsByUser([userId])
  return reputations.get(String(userId)) ?? null
}
