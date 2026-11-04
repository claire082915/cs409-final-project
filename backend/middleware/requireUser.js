import { verifyToken } from '../lib/auth.js'

export default function requireUser(req, res, next) {
  const [scheme, token] = req.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Missing bearer token' })
  }
  try {
    req.userId = verifyToken(token)
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
  next()
}
