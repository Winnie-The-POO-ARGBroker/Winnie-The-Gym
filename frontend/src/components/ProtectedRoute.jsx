import { Navigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'

export default function ProtectedRoute({ children, roles }) {
  const { accessToken, user } = useAuthStore()

  if (!accessToken) return <Navigate to="/login" replace />
  if (user && !user.is_profile_complete) return <Navigate to="/completar-perfil" replace />

  if (roles && user && !roles.includes(user.rol)) {
    const home = user.rol === 'socio' ? '/socio/credencial' : '/dashboard'
    return <Navigate to={home} replace />
  }

  return children
}
