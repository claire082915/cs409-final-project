import { ShieldCheck } from 'lucide-react'
import InfoTip from './InfoTip.jsx'
import '../styles/components/trust-badge.css'

// Same rule as the backend's trust.js
const TRUSTED_RULE = 'Returned 3+ items, 90% on time, rated 4+ by lenders.'

// Only trusted borrowers get a badge, standard and new ones show nothing
export default function TrustBadge({ trust }) {
  if (trust !== 'trusted') {
    return null
  }
  return (
    <span className="trust-badge-group">
      <span className="trust-badge">
        <ShieldCheck size={13} aria-hidden="true" />
        Trusted
      </span>
      <InfoTip text={TRUSTED_RULE} label="What Trusted means" />
    </span>
  )
}
