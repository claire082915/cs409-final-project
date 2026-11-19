import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'

export default function RequireAuth() {
  const { user, profile } = useAuth()
  if (!user || !profile || !user.emailVerified) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
