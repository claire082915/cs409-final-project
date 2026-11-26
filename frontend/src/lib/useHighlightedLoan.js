import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

// Matches the highlight animation in global.css, picked by eye
const HIGHLIGHT_MS = 3000

export function useHighlightedLoan(isLoaded) {
  const location = useLocation()
  // Kept in state since writing filters to the URL clears the router state
  const [highlightId, setHighlightId] = useState(location.state?.highlightId)

  useEffect(() => {
    if (!isLoaded || !highlightId) {
      return
    }
    document.getElementById(`loan-${highlightId}`)?.scrollIntoView({ block: 'center' })
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS)
    return () => clearTimeout(timer)
  }, [isLoaded, highlightId])

  return highlightId
}
