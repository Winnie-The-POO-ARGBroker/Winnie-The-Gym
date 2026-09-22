import useAuthStore from '../stores/authStore'

export default function useAuth() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)
  const refreshToken = useAuthStore((s) => s.refreshToken)
  const setAuth = useAuthStore((s) => s.setAuth)
  const clearAuth = useAuthStore((s) => s.clearAuth)

  return { user, accessToken, refreshToken, setAuth, clearAuth }
}
