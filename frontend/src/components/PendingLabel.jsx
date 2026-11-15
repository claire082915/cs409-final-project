import { useWaking } from '../lib/useWaking.js'

export default function PendingLabel({ pending, children, pendingText = children }) {
  const waking = useWaking(pending)
  if (waking) {
    return 'Waking up the server…'
  }
  return pending ? pendingText : children
}
