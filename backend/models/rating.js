import mongoose from 'mongoose'

const ratingSchema = new mongoose.Schema(
  {
    loan: { type: mongoose.Schema.Types.ObjectId, ref: 'Loan', required: true },
    rater: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ratee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    score: { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true },
)

ratingSchema.index({ loan: 1, rater: 1 }, { unique: true })
export default mongoose.model('Rating', ratingSchema)
