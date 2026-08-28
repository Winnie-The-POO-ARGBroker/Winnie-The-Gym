import { Navigate } from 'react-router-dom'
import useAuth from '../../hooks/useAuth'

export default function PublicRoute({ children }) {
  const { accessToken, user } = useAuth()
  if (accessToken && user) {
    const home = user.rol === 'socio' ? '/socio/credencial' : '/dashboard'
    return <Navigate to={home} replace />
  }
  return children
}
