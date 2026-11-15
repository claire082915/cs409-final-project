import { useEffect, useState } from 'react'

// Render's free server sleeps when idle, so a wait longer than this is probably it waking up
const WAKING_DELAY_MS = 3000

export function useWaking(pending) {
  const [waking, setWaking] = useState(false)

  useEffect(() => {
    if (!pending) {
      return
    }
    const timeout = window.setTimeout(() => setWaking(true), WAKING_DELAY_MS)
    return () => {
      window.clearTimeout(timeout)
      setWaking(false)
    }
  }, [pending])

  return pending && waking
}
