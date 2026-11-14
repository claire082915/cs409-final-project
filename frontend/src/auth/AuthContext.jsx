import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase.js'
import { apiFetch } from '../lib/api.js'

const AuthContext = createContext(null)

// A 403 means the user signed in but has not picked a username yet
async function loadProfile() {
  try {
    return await apiFetch('users/me')
  } catch (err) {
    if (err.status === 403) {
      return null
    }
    throw err
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(
    () =>
      onAuthStateChanged(auth, async (firebaseUser) => {
        setLoading(true)
        setError('')
        setUser(firebaseUser)
        let nextProfile = null
        let loadError = ''
        try {
          nextProfile = firebaseUser && (await loadProfile())
        } catch (err) {
          loadError = err.message
        }
        // Skip the result if the user signed out or switched accounts while it loaded
        if (auth.currentUser?.uid !== firebaseUser?.uid) {
          return
        }
        setProfile(nextProfile)
        setError(loadError)
        setLoading(false)
      }),
    [],
  )

  return <AuthContext value={{ user, profile, setProfile, loading, error }}>{children}</AuthContext>
}

export function useAuth() {
  return useContext(AuthContext)
}
