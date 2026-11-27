import mongoose from 'mongoose'

const KINDS = ['auto-approved', 'due-soon', 'found', 'empty', 'error']

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    kind: { type: String, enum: KINDS, required: true },
    title: { type: String, required: true },
    text: { type: String, required: true },
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan' },
    // Ties an auto-populate result to the review still open in that browser
    taskId: Number,
    read: { type: Boolean, default: false },
    // Kept after dismissing so a reminder isn't created again for the same loan
    dismissed: { type: Boolean, default: false },
  },
  { timestamps: true },
)

notificationSchema.index({ user: 1, dismissed: 1, createdAt: -1 })
// One due soon reminder per loan
notificationSchema.index(
  { user: 1, loan: 1 },
  { unique: true, partialFilterExpression: { kind: 'due-soon' } },
)

export default mongoose.model('Notification', notificationSchema)
