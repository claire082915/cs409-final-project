import mongoose from 'mongoose'
import { isUserPhotoUrl } from '../lib/cloudinary.js'

const userSchema = new mongoose.Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // Usernames go in profile URLs, so only allow characters that need no encoding
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-z0-9._]{3,20}$/,
        'Username must be 3 to 20 characters, using only letters, digits, dots or underscores',
      ],
    },
    displayName: { type: String, required: true, trim: true },
    city: { type: String, trim: true },
    // Five digits is enough to look up a location for distance, so ZIP+4 is not accepted
    zipCode: { type: String, trim: true, match: [/^\d{5}$/, 'ZIP code must be 5 digits'] },
    // Cloudinary URL from the user's own folder, an empty string removes it
    photo: {
      type: String,
      validate: {
        validator(url) {
          return url === '' || isUserPhotoUrl(url, this._id)
        },
        message: 'Profile photo must be uploaded by you',
      },
    },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
