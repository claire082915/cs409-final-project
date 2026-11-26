import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { discardTask } from '../lib/detectionTask.js'
import { forgetNotifications } from '../lib/notifications.js'
import { useAuth } from './AuthContext.jsx'

// Log out is a route so pages with unsaved changes can block it like any other navigation
export default function LogOutRoute() {
  const { user } = useAuth()

  useEffect(() => {
    // Drafts and notifications belong to this user, so they go before the next one signs in
    discardTask()
    forgetNotifications()
    signOut(auth)
  }, [])

  // Wait for the sign out, or login would send a signed-in user back to the dashboard
  if (user) {
    return null
  }
  return <Navigate to="/login" replace />
}
