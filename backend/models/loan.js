import mongoose from 'mongoose'

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
    approvedAt: Date,
    returnedAt: Date,
    confirmedAt: Date,
    // Owner's rating of the borrower, unset until rated
    rating: {
      type: Number,
      min: 1,
      max: 5,
      validate: { validator: Number.isInteger, message: 'Rating must be a whole number' },
    },
  },
  { timestamps: true },
)

export default mongoose.model('Loan', loanSchema)
