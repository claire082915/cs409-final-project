import mongoose from 'mongoose'
import { isUserPhotoUrl } from '../lib/cloudinary.js'

// University Housing's halls and apartments, then off campus areas
export const CAMPUS_AREAS = [
  'Ikenberry Commons (Ike)',
  'Illinois Street (ISR)',
  'Lincoln Avenue (LAR)',
  'Allen Hall',
  'Busey-Evans',
  'Pennsylvania Avenue (PAR)',
  'Florida Avenue (FAR)',
  'Sherman Hall',
  'Daniels Hall',
  'Orchard Downs',
  'Goodwin-Green',
  'Ashton Woods',
  'Campustown',
  'Champaign',
  'Urbana',
]

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
    // Where on campus the user is, an empty string clears it
    campusArea: {
      type: String,
      enum: { values: ['', ...CAMPUS_AREAS], message: 'Pick a campus area from the list' },
    },
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
    // Notification and privacy choices from the Account page
    preferences: {
      borrowRequests: { type: Boolean, default: true },
      dueDateReminders: { type: Boolean, default: true },
      showProfile: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
