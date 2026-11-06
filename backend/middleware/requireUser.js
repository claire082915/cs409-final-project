import { getAuth } from 'firebase-admin/auth'
import User from '../models/user.js'

// Null when the header is missing or the token is bad or expired
async function decodeIdToken(req) {
  const [scheme, idToken] = req.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Bearer' || !idToken) {
    return null
  }
  try {
    return await getAuth().verifyIdToken(idToken)
  } catch {
    return null
  }
}

// For creating a profile, when the signed in user has none yet
export async function requireIdToken(req, res, next) {
  req.idToken = await decodeIdToken(req)
  if (!req.idToken) {
    return res.status(401).json({ message: 'Missing or invalid token', data: {} })
  }
  next()
}

export default async function requireUser(req, res, next) {
  const idToken = await decodeIdToken(req)
  if (!idToken) {
    return res.status(401).json({ message: 'Missing or invalid token', data: {} })
  }
  const user = await User.findOne({ firebaseUid: idToken.uid })
  if (!user) {
    return res.status(403).json({ message: 'Create a profile first', data: {} })
  }
  req.userId = user.id
  next()
}
