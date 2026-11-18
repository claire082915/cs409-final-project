import '../styles/components/avatar.css'

// Matches the number of avatar-color classes in avatar.css
const COLOR_COUNT = 8

// First letters of the first two words, like JS for Jane Smith
function initials(name) {
  let letters = ''
  for (const word of name.trim().split(/\s+/).slice(0, 2)) {
    letters += word[0]
  }
  return letters.toUpperCase()
}

// Java's String.hashCode, so the same username always lands on the same color
function colorIndex(username) {
  let hash = 0
  for (const char of username) {
    hash = Math.imul(hash, 31) + char.charCodeAt(0)
  }
  return Math.abs(hash) % COLOR_COUNT
}

// The caller's class sets the size and font size
export default function Avatar({ photo, name, username, className = '' }) {
  return (
    <span className={`avatar avatar-color-${colorIndex(username)} ${className}`}>
      {photo ? <img src={photo} alt="" /> : <span aria-hidden="true">{initials(name)}</span>}
    </span>
  )
}
