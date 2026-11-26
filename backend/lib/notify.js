import Loan from '../models/loan.js'
import Notification from '../models/notification.js'
import { isDuplicateKeyError } from './duplicateKey.js'

export const DUE_SOON_DAYS = 3
export const MS_PER_DAY = 24 * 60 * 60 * 1000
// Due dates are saved as midnight UTC of the picked day
const dateFormat = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

function personName(person) {
  return person.displayName || `@${person.username}`
}

const LOAN_MESSAGES = {
  'auto-approved': {
    to: 'owner',
    title: 'Request auto-approved',
    text: ({ item, borrower }) => `${item} lent to ${borrower}.`,
  },
  'due-soon': {
    to: 'borrower',
    preference: 'dueDateReminders',
    title: 'Due soon',
    text: ({ item, owner, dueDate }) => `${item} is due back to ${owner} on ${dueDate}.`,
  },
}

// Loads its own copy so the caller's loan isn't populated with the other user's preferences
export async function notifyLoan(loanId, kind) {
  const message = LOAN_MESSAGES[kind]
  const loan = await Loan.findById(loanId).populate([
    { path: 'item', select: 'name' },
    { path: 'owner', select: 'username displayName preferences' },
    { path: 'borrower', select: 'username displayName preferences' },
  ])
  const recipient = loan[message.to]
  if (message.preference && !recipient.preferences[message.preference]) {
    return
  }
  const names = {
    item: loan.item.name,
    owner: personName(loan.owner),
    borrower: personName(loan.borrower),
    dueDate: dateFormat.format(loan.dueDate),
  }
  await Notification.create({
    user: recipient._id,
    kind,
    title: message.title,
    text: message.text(names),
    loan: loan._id,
  })
}

// Another tab loading at the same moment might have made it, the unique index catches that
async function remindOnce(loanId) {
  try {
    await notifyLoan(loanId, 'due-soon')
  } catch (err) {
    if (!isDuplicateKeyError(err)) {
      throw err
    }
  }
}

// Run when the user loads notifications, so reminders appear without a scheduled job
export async function createDueReminders(userId) {
  const now = new Date()
  const dueSoonCutoff = new Date(now.getTime() + DUE_SOON_DAYS * MS_PER_DAY)
  const [dueSoon, made] = await Promise.all([
    Loan.find({
      borrower: userId,
      status: 'approved',
      dueDate: { $gte: now, $lte: dueSoonCutoff },
    }),
    Notification.distinct('loan', { user: userId, kind: 'due-soon' }),
  ])
  const remindedLoanIds = new Set(made.map(String))

  const newReminders = []
  for (const loan of dueSoon) {
    if (!remindedLoanIds.has(String(loan._id))) {
      newReminders.push(remindOnce(loan._id))
    }
  }
  await Promise.all(newReminders)
}

export async function notifyDetection(userId, taskId, { kind, title, text }) {
  await Notification.create({ user: userId, kind, title, text, taskId })
}
