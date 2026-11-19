import { getAuth } from 'firebase-admin/auth'
import User from '../models/user.js'
import { isDemoEmail } from '../lib/demoAccount.js'

// Demo only, nobody can open mail at the demo domain, so a verified demo account was made by us
function isAllowedToken(decodedToken) {
  if (decodedToken.email.endsWith('@illinois.edu')) {
    return true
  }
  return isDemoEmail(decodedToken.email) && decodedToken.email_verified
}

// Null when the header is missing, the token is bad or expired, or the email isn't allowed
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
  return isAllowedToken(decodedToken) ? decodedToken : null
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
