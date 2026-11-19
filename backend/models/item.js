import mongoose from 'mongoose'
import { isUserPhotoUrl } from '../lib/cloudinary.js'

// Same list as the frontend's itemCategories.js
export const ITEM_CATEGORIES = [
  'Electronics',
  'Books',
  'Tools',
  'Outdoor',
  'Sports',
  'Kitchen',
  'Home',
  'Games',
  'Crafts',
  'Events',
  'Other',
]

// Facebook Marketplace's used item conditions, same list as the frontend's itemConditions.js
export const ITEM_CONDITIONS = ['New', 'Like new', 'Good', 'Fair']

// Availability comes from loans
const itemSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    category: {
      type: String,
      enum: { values: ITEM_CATEGORIES, message: 'Pick a category from the list' },
      default: 'Other',
    },
    // Null when the owner didn't say, the enum check skips it
    condition: {
      type: String,
      enum: { values: ITEM_CONDITIONS, message: 'Pick a condition from the list' },
      default: null,
    },
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
    // Set when the owner deletes the item
    deletedAt: Date,
  },
  { timestamps: true },
)

// Item lists are filtered by owner and sorted newest first
itemSchema.index({ owner: 1, createdAt: -1 })

export default mongoose.model('Item', itemSchema)
