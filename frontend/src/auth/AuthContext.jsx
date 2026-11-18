import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { apiFetch } from '../lib/api.js'
import AppLoader from '../components/AppLoader.jsx'
import { isSchoolEmail } from './schoolEmail.js'

const AuthContext = createContext(null)

async function loadProfile() {
  try {
    return await apiFetch('users/me')
  } catch (err) {
    // A 403 means the user has no profile yet
    if (err.status === 403) {
      return null
    }
    throw err
  }
}

// The backend rejects everyone else, so skip the request
function canLoadProfile(firebaseUser) {
  return firebaseUser?.emailVerified && isSchoolEmail(firebaseUser.email)
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const syncUser = async (firebaseUser) => {
    setLoading(true)
    setError('')
    setUser(firebaseUser)
    let nextProfile = null
    let loadError = ''
    try {
      nextProfile = canLoadProfile(firebaseUser) && (await loadProfile())
    } catch (err) {
      loadError = err.message
    }
    // Skip the result if the user signed out or switched accounts while it loaded
    if (auth.currentUser?.uid !== firebaseUser?.uid) {
      return
    }
    // Keep the profile sign up just created if users/me answered 403 first
    setProfile(
      (current) => nextProfile || (current?.firebaseUid === firebaseUser?.uid ? current : null),
    )
    setError(loadError)
    setLoading(false)
    setReady(true)
  }

  useEffect(() => onAuthStateChanged(auth, syncUser), [])

  // Pick up an email verified in another tab, since that fires no auth state change
  const refreshUser = async () => {
    await auth.currentUser.reload()
    await auth.currentUser.getIdToken(true)
    await syncUser(auth.currentUser)
  }

  return (
    <AuthContext value={{ user, profile, setProfile, refreshUser, loading, error }}>
      {/* Cover the app only on first load, later sign ins keep the page mounted so it keeps its state */}
      {ready ? children : <AppLoader />}
    </AuthContext>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
