import { Navigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'

export default function PublicRoute({ children }) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const user = useAuthStore((s) => s.user)
  if (accessToken && user) {
    const home = user.rol === 'socio' ? '/socio/credencial' : '/dashboard'
    return <Navigate to={home} replace />
  }
  return children
}
