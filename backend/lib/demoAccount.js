// Demo only, the shared account the demo login signs into plus 20 spares made by hand
const DEMO_USERNAMES = ['demo']
for (let number = 1; number <= 20; number++) {
  DEMO_USERNAMES.push(`demo${number}`)
}

export function demoEmail() {
  return `demo@${process.env.DEMO_EMAIL_DOMAIN}`
}

// Demo only, an allow-listed name on the demo domain, so other addresses there stay locked out
export function isDemoEmail(email) {
  const [name, domain] = email.split('@')
  return (
    Boolean(process.env.DEMO_EMAIL_DOMAIN) &&
    domain === process.env.DEMO_EMAIL_DOMAIN &&
    DEMO_USERNAMES.includes(name)
  )
}

// Demo only, demo accounts keep the username from their email and nobody else can take one
export function demoUsernameError(email, username) {
  const name = username.trim().toLowerCase()
  if (isDemoEmail(email)) {
    return name === email.split('@')[0] ? null : 'Demo accounts keep the username from their email'
  }
  return DEMO_USERNAMES.includes(name) ? 'That username is reserved' : null
}
