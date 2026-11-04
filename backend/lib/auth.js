import jwt from 'jsonwebtoken'

const tokenLifetime = '7d'

export function signToken(userId) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: userId.toString(),
    expiresIn: tokenLifetime,
  })
}

// Throws on a bad or expired token
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET).sub
}
