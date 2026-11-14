import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function RequireAuth() {
  const { user, profile, loading } = useAuth()
  if (loading) {
    return null
  }
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
