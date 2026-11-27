import { fromDate, parseDate, toCalendarDate, today } from '@internationalized/date'

// Due days follow the UIUC calendar wherever the user is, the same as the backend
const CAMPUS_TIME_ZONE = 'America/Chicago'

export function campusToday() {
  return today(CAMPUS_TIME_ZONE)
}

// The campus calendar day an exact time fell on
export function campusDay(timestamp) {
  return toCalendarDate(fromDate(new Date(timestamp), CAMPUS_TIME_ZONE))
}

// Due dates are saved as midnight UTC of the picked day, so the first 10 characters are that day
export function dueDay(loan) {
  return parseDate(String(loan.dueDate).slice(0, 10))
}

// Dates from another year also show the year
function formatWithYear(date, year, options, timeZone) {
  const yearOption = year === campusToday().year ? {} : { year: 'numeric' }
  return new Intl.DateTimeFormat(undefined, { ...yearOption, ...options, timeZone }).format(date)
}

// Due dates are calendar days saved at midnight UTC, so read them in UTC to keep the picked day
export function formatDueDate(dueDate, options) {
  const date = new Date(dueDate)
  return formatWithYear(date, date.getUTCFullYear(), options, 'UTC')
}

// Everything else is an exact time, shown as the day it was on campus
export function formatTimestamp(timestamp, options) {
  return formatWithYear(new Date(timestamp), campusDay(timestamp).year, options, CAMPUS_TIME_ZONE)
}
