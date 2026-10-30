import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import cors from 'cors'

const port = process.env.PORT || 3000
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',')

const app = express()
app.use(cors({ origin: allowedOrigins }))
app.use(express.json())

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
})

// Connect before listening so requests never hit a server without a database
await mongoose.connect(process.env.MONGODB_URI)
app.listen(port, () => {
    console.log(`Server running on port ${port}`)
})
