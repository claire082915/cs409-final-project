import { Star } from 'lucide-react'
import '../styles/components/reputation.css'

// The backend sends null when nobody has rated the user yet
export default function Reputation({ reputation }) {
  if (!reputation) {
    return <span className="reputation">Unrated</span>
  }
  const { average, count } = reputation
  return (
    <span className="reputation">
      <Star size={14} aria-hidden="true" />
      {average.toFixed(1)} · {count} {count === 1 ? 'rating' : 'ratings'}
    </span>
  )
}
