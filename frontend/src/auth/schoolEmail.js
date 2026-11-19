export const SCHOOL_DOMAIN = 'illinois.edu'

// Lowercase since people type emails with capitals on phones
export function isSchoolEmail(email) {
  return email.trim().toLowerCase().endsWith(`@${SCHOOL_DOMAIN}`)
}

export function netIdToEmail(netId) {
  return `${netId.trim().toLowerCase()}@${SCHOOL_DOMAIN}`
}
