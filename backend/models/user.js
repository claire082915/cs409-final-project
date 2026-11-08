import mongoose from 'mongoose'

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
        /^[a-z0-9._]{3,30}$/,
        'Username must be 3 to 30 letters, digits, dots or underscores',
      ],
    },
    displayName: { type: String, required: true, trim: true },
  },
  { timestamps: true },
)

export default mongoose.model('User', userSchema)
