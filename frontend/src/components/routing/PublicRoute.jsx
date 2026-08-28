import { Navigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'

export default function PublicRoute({ children }) {
  const { accessToken, user } = useAuthStore()
  if (accessToken && user) return <Navigate to="/dashboard" replace />
  return children
}
