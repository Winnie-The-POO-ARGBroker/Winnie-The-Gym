import { Navigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

export default function ProtectedRoute({ children }) {
  const { accessToken } = useAuthStore()

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return children
}
