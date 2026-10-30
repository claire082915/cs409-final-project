import mongoose from 'mongoose'

// Availability comes from whether an active loan exists, so it isn't stored here
const itemSchema = new mongoose.Schema(
  {
    // Indexed for browsing a user's items
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // Cloudinary URLs, the images themselves stay out of Mongo
    photos: [String],
  },
  { timestamps: true },
)

export default mongoose.model('Item', itemSchema)
