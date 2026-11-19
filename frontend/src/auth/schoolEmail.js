export const SCHOOL_DOMAIN = 'illinois.edu'

// Demo only, set to show the demo login and let the demo accounts in, unset allows only Illinois
export const DEMO_EMAIL_DOMAIN = import.meta.env.VITE_DEMO_EMAIL_DOMAIN

// Demo only, the shared account the demo login signs into plus 20 spares, same list as the backend
const DEMO_USERNAMES = ['demo']
for (let number = 1; number <= 20; number++) {
  DEMO_USERNAMES.push(`demo${number}`)
}

// Demo only, an allow-listed name on the demo domain, so other addresses there stay locked out
export function isDemoEmail(email) {
  const [name, domain] = email.split('@')
  return Boolean(DEMO_EMAIL_DOMAIN) && domain === DEMO_EMAIL_DOMAIN && DEMO_USERNAMES.includes(name)
}

// Lowercase since people type emails with capitals on phones
export function isAllowedEmail(email) {
  const normalized = email.trim().toLowerCase()
  return normalized.endsWith(`@${SCHOOL_DOMAIN}`) || isDemoEmail(normalized)
}

export function netIdToEmail(netId) {
  return `${netId.trim().toLowerCase()}@${SCHOOL_DOMAIN}`
}
