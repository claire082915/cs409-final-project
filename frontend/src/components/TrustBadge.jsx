import '../styles/components/trust-badge.css'

// Only trusted borrowers get a badge, standard and new ones show nothing
export default function TrustBadge({ trust }) {
  if (trust !== 'trusted') {
    return null
  }
  return <span className="trust-badge">Trusted</span>
}
