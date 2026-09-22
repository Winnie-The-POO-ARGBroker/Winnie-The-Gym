import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

const STAFF_ROLES = ['administrador', 'recepcionista']

export default function ProtectedRoute({ children, roles }) {
  const { accessToken, user } = useAuth()

  if (!accessToken) return <Navigate to="/login" replace />
  // Staff users (admin, recepcionista) do not have a Socio record, so
  // is_profile_complete is always false for them. Only redirect socios.
  if (user && !user.is_profile_complete && !STAFF_ROLES.includes(user.rol)) {
    return <Navigate to="/completar-perfil" replace />
  }

  if (roles && user && !roles.includes(user.rol)) {
    const home = user.rol === 'socio' ? '/socio/credencial' : '/dashboard'
    return <Navigate to={home} replace />
  }

  return children
}
