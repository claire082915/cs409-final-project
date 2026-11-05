import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    // OAuth signup flow will have to set one too
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    displayName: { type: String, required: true, trim: true },
    // Missing for accounts that sign in with OAuth
    passwordHash: String,
  },
  {
    timestamps: true,
    toJSON: {
      // Keep the hash out of every response
      transform(doc, user) {
        delete user.passwordHash
        return user
      },
    },
  },
)

export default mongoose.model('User', userSchema)
