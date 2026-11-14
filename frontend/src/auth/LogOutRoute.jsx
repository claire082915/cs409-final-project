import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { useAuth } from './AuthContext.jsx'

// Log out is a route so pages with unsaved changes can block it like any other navigation
export default function LogOutRoute() {
  const { user } = useAuth()

  useEffect(() => {
    signOut(auth)
  }, [])

  // Wait for the sign out, or login would send a signed-in user back to the dashboard
  if (user) {
    return null
  }
  return <Navigate to="/login" replace />
}
