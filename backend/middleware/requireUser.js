import { getAuth } from 'firebase-admin/auth'
import User from '../models/user.js'

const SCHOOL_EMAIL_DOMAIN = '@illinois.edu'

// Null when the header is missing, the token is bad or expired, or the email is outside the school
async function decodeIdToken(req) {
  const [scheme, idToken] = req.get('Authorization')?.split(' ') ?? []
  if (scheme !== 'Bearer' || !idToken) {
    return null
  }
  let decodedToken
  try {
    decodedToken = await getAuth().verifyIdToken(idToken)
  } catch {
    return null
  }
  return decodedToken.email.endsWith(SCHOOL_EMAIL_DOMAIN) ? decodedToken : null
}

// For creating a profile, which sign up does before the email is verified
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
  if (!idToken.email_verified) {
    return res.status(403).json({ message: 'Verify your email first', data: {} })
  }
  const user = await User.findOne({ firebaseUid: idToken.uid })
  if (!user) {
    return res.status(403).json({ message: 'Create a profile first', data: {} })
  }
  req.user = user
  req.userId = user.id
  next()
}
