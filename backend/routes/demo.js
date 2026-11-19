import { Router } from 'express'
import { getAuth } from 'firebase-admin/auth'
import User from '../models/user.js'
import { demoEmail } from '../lib/demoAccount.js'

// Demo only, signs anyone into one shared account so graders can try Lendr without an Illinois email
const router = Router()
const DEMO_USERNAME = 'demo'
const DEMO_DISPLAY_NAME = 'Demo User'

// Made verified since nobody can open mail sent to the demo domain
async function findOrCreateDemoFirebaseUser(email) {
  try {
    return await getAuth().getUserByEmail(email)
  } catch (err) {
    if (err.code !== 'auth/user-not-found') {
      throw err
    }
    return getAuth().createUser({ email, emailVerified: true, displayName: DEMO_DISPLAY_NAME })
  }
}

// The profile is made with the account so the demo skips the Finish your profile step
router.post('/token', async (req, res) => {
  const email = demoEmail()
  const firebaseUser = await findOrCreateDemoFirebaseUser(email)
  await User.updateOne(
    { firebaseUid: firebaseUser.uid },
    { $setOnInsert: { email, username: DEMO_USERNAME, displayName: DEMO_DISPLAY_NAME } },
    { upsert: true, runValidators: true },
  )
  const token = await getAuth().createCustomToken(firebaseUser.uid)
  res.json({ message: 'OK', data: { token } })
})

export default router
