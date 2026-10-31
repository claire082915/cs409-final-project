import mongoose from 'mongoose'

// Availability comes from loans
const itemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // Cloudinary URLs
    photos: [String],
  },
  { timestamps: true },
)

export default mongoose.model('Item', itemSchema)
