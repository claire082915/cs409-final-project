import { Router } from 'express'
import bcrypt from 'bcryptjs'
import User from '../models/user.js'
import { signToken } from '../lib/auth.js'

const minPasswordLength = 8
const hashRounds = 10

const router = Router()

function readCredentials(body) {
  const email = body?.email
  const password = body?.password
  if (typeof email !== 'string' || typeof password !== 'string') {
    return null
  }
  return { email: email.trim().toLowerCase(), password }
}

router.post('/register', async (req, res) => {
  const credentials = readCredentials(req.body)
  if (!credentials) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  if (credentials.password.length < minPasswordLength) {
    return res
      .status(400)
      .json({ message: `Password must be at least ${minPasswordLength} characters` })
  }
  const { username, displayName } = req.body
  if (typeof username !== 'string' || typeof displayName !== 'string') {
    return res.status(400).json({ message: 'Username and display name are required' })
  }
  if (await User.exists({ email: credentials.email })) {
    return res.status(409).json({ message: 'Email is already registered' })
  }
  if (await User.exists({ username: username.trim().toLowerCase() })) {
    return res.status(409).json({ message: 'Username is taken' })
  }
  const passwordHash = await bcrypt.hash(credentials.password, hashRounds)
  const user = await User.create({ email: credentials.email, username, displayName, passwordHash })
  res.status(201).json({ token: signToken(user._id), user })
})

router.post('/login', async (req, res) => {
  const credentials = readCredentials(req.body)
  if (!credentials) {
    return res.status(400).json({ message: 'Email and password are required' })
  }
  const user = await User.findOne({ email: credentials.email })
  // Same message for every case so it doesn't reveal which accounts exist
  if (!user?.passwordHash || !(await bcrypt.compare(credentials.password, user.passwordHash))) {
    return res.status(401).json({ message: 'Wrong email or password' })
  }
  res.json({ token: signToken(user._id), user })
})

export default router
