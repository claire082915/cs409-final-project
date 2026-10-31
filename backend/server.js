import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'
import itemsRouter from './routes/items.js'

const port = process.env.PORT || 3000
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',')

const app = express()
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/items', itemsRouter)

// Send bad ids and failed validation back as 400s, keep body parser statuses, hide the rest
app.use((err, req, res, next) => {
  if (err.name === 'CastError' || err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message })
  }
  if (err.status) {
    return res.status(err.status).json({ message: err.message })
  }
  console.error(err)
  res.status(500).json({ message: 'Server error' })
})

// Connect before listening so requests never hit a server without a database
await mongoose.connect(process.env.MONGODB_URI)
app.listen(port, () => {
  console.log(`Server running on port ${port}`)
})
