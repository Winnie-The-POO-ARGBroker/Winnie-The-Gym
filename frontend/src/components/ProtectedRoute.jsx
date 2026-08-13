import { Navigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

export default function ProtectedRoute({ children }) {
  const { user, accessToken } = useAuthStore()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  if (!user.is_profile_complete) return <Navigate to="/completar-perfil" replace />
  return children
}
