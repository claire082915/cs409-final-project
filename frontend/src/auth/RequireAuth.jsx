import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './AuthContext.jsx'
import AppLoader from '../components/AppLoader.jsx'

export default function RequireAuth() {
  const { user, profile, loading } = useAuth()
  if (loading) {
    return <AppLoader />
  }
  if (!user || !profile) {
    return <Navigate to="/login" replace />
  }
  return <Outlet />
}
