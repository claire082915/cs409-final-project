import mongoose from 'mongoose'

// Placeholder until auth lands
export default function requireUser(req, res, next) {
  const userId = req.get('X-User-Id')
  if (!mongoose.isObjectIdOrHexString(userId)) {
    return res.status(401).json({ message: 'Missing or invalid X-User-Id header' })
  }
  req.userId = userId
  next()
}
