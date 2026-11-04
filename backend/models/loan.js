import mongoose from 'mongoose'

const STATUSES = ['requested', 'approved', 'returned', 'confirmed']

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
  },
  { timestamps: true },
)

export default mongoose.model('Loan', loanSchema)
