import { endOfMonth, endOfWeek } from '@internationalized/date'
import { campusToday, dueDay } from './campusDate.js'
import { isFinished } from './loanStatus.js'

// Custom row starts at two weeks, a common loan length
export const ANY_DUE_DATE = { range: 'any', amount: 2, unit: 'weeks' }

function dueCutoff({ range, amount, unit }, today) {
  if (range === 'week') return endOfWeek(today, navigator.language)
  if (range === 'month') return endOfMonth(today)
  return today.add({ [unit]: amount })
}

export function matchesDueDate(loan, dueFilter) {
  if (dueFilter.range === 'any') return true
  if (isFinished(loan)) return false
  const today = campusToday()
  const dueDate = dueDay(loan)
  return dueDate.compare(today) >= 0 && dueDate.compare(dueCutoff(dueFilter, today)) <= 0
}

// Short URL form of a due date filter, like week, month or 3-days
export function dueDateParam({ range, amount, unit }) {
  return range === 'custom' ? `${amount}-${unit}` : range
}

export function dueDateFromParam(param) {
  if (!param) return ANY_DUE_DATE
  if (param === 'week' || param === 'month') return { ...ANY_DUE_DATE, range: param }
  const [amount, unit] = param.split('-')
  return { range: 'custom', amount: Number(amount), unit }
}
