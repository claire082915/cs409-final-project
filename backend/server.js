import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import { initializeApp, cert } from 'firebase-admin/app'
import itemsRouter from './routes/items.js'
import uploadsRouter from './routes/uploads.js'
import loansRouter from './routes/loans.js'
import usersRouter from './routes/users.js'

const port = process.env.PORT || 3000
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',')
// MongoDB's error code for a write that breaks a unique index
const duplicateKeyCode = 11000

initializeApp({ credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) })

const app = express()
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ message: 'OK', data: { status: 'ok' } })
})

app.use('/api/items', itemsRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/loans', loansRouter)
app.use('/api/users', usersRouter)

app.use((err, req, res, next) => {
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message, data: {} })
  }
  if (err.code === duplicateKeyCode) {
    const field = Object.keys(err.keyValue)[0]
    return res.status(409).json({ message: `${field} is already taken`, data: {} })
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message, data: {} })
  }
  console.error(err)
  res.status(500).json({ message: 'Server error', data: {} })
})

await mongoose.connect(process.env.MONGODB_URI)
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
