import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'
import CompleteProfilePage from '../../pages/CompleteProfilePage'

export default function CompleteProfileRoute() {
  const { accessToken, user } = useAuth()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  if (user.is_profile_complete) return <Navigate to="/dashboard" replace />
  return <CompleteProfilePage />
}
