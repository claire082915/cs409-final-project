import { Router } from 'express'
import requireUser from '../middleware/requireUser.js'
import { signUpload } from '../lib/cloudinary.js'

const router = Router()
router.use(requireUser)

router.post('/signature', (req, res) => {
  res.json(signUpload(req.userId))
})

export default router
