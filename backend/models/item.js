import mongoose from 'mongoose'
import { isUserPhotoUrl } from '../lib/cloudinary.js'

// Availability comes from loans
const itemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // Cloudinary URLs from the owner's folder
    photos: {
      type: [String],
      validate: {
        validator(urls) {
          return urls.every((url) => isUserPhotoUrl(url, this.owner))
        },
        message: 'Photos must be uploaded by the item owner',
      },
    },
  },
  { timestamps: true },
)

export default mongoose.model('Item', itemSchema)
