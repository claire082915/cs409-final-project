import { parseDate, today } from '@internationalized/date'

// Due days follow the UIUC calendar, so a loan due Dec 6 is on time until midnight Central
export const CAMPUS_TIME_ZONE = 'America/Chicago'

// Due dates are saved as midnight UTC of the picked day, so today is saved the same way to compare
export function campusToday() {
  return new Date(`${today(CAMPUS_TIME_ZONE)}T00:00:00Z`)
}

// The moment a day saved as midnight UTC starts on campus
export function campusDayStart(day) {
  return parseDate(day.toISOString().slice(0, 10)).toDate(CAMPUS_TIME_ZONE)
}
