import mongoose from 'mongoose'
import zipcodes from 'zipcodes'

const ZIP_CODE_PATTERN = /^\d{5}$/
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
    zipCode: { type: String, trim: true, match: [ZIP_CODE_PATTERN, 'ZIP code must be 5 digits'] },
    // Center of the ZIP code area as a GeoJSON point, set from zipCode when it changes
    location: {
      type: { type: String, enum: ['Point'] },
      // No default so users without a ZIP code have no location at all
      coordinates: { type: [Number], default: undefined },
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
    // Notification and privacy choices from Settings
    preferences: {
      borrowRequests: { type: Boolean, default: true },
      dueDateReminders: { type: Boolean, default: true },
      showProfile: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
)

// Lets nearby searches find users by distance, users without a location are skipped
userSchema.index({ location: '2dsphere' })

// Also fills in users who saved a ZIP code before locations existed
userSchema.pre('validate', function () {
  if (!this.isModified('zipCode') && (this.location?.coordinates || !this.zipCode)) {
    return
  }
  if (!this.zipCode) {
    this.location = undefined
    return
  }
  // Leave a badly formatted ZIP code to the match check and its clearer message
  if (!ZIP_CODE_PATTERN.test(this.zipCode)) {
    return
  }
  const place = zipcodes.lookup(this.zipCode)
  if (!place) {
    this.invalidate('zipCode', 'Unknown ZIP code')
    return
  }
  // GeoJSON puts longitude first
  this.location = { type: 'Point', coordinates: [place.longitude, place.latitude] }
})

export default mongoose.model('User', userSchema)
