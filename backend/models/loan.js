import mongoose from 'mongoose'
import { isUserPhotoUrl } from '../lib/cloudinary.js'

const STATUSES = ['requested', 'approved', 'returned', 'confirmed', 'rejected', 'cancelled']
// The item stays on loan until the owner confirms the return
export const ACTIVE_STATUSES = ['approved', 'returned']

const loanSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
    borrower: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: STATUSES,
      default: 'requested',
      required: true,
    },
    dueDate: { type: Date, required: true },
    // Optional note from the borrower to the owner
    message: {
      type: String,
      trim: true,
      default: '',
      maxlength: [300, 'Message must be 300 characters or fewer'],
    },
    approvedAt: Date,
    returnedAt: Date,
    returnPhoto: {
      type: String,
      validate: {
        validator(url) {
          return isUserPhotoUrl(url, this.borrower)
        },
        message: 'Return photo must be uploaded by the borrower',
      },
    },
    confirmedAt: Date,
  },
  { timestamps: true },
)

loanSchema.index({ item: 1, status: 1 })
loanSchema.index({ owner: 1, createdAt: -1 })
loanSchema.index({ borrower: 1, createdAt: -1 })
// Only one loan can hold an item at a time
loanSchema.index(
  { item: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ACTIVE_STATUSES } } },
)
// Each borrower can have one pending request per item
loanSchema.index(
  { item: 1, borrower: 1 },
  { unique: true, partialFilterExpression: { status: 'requested' } },
)

export default mongoose.model('Loan', loanSchema)
