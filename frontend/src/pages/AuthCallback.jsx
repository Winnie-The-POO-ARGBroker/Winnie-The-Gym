import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import useAuth from '../hooks/useAuth'
import api from '../services/api'
import WinnieLogo from '../components/ui/WinnieLogo'

/**
 * Handles the redirect from Google after the auth-code OAuth flow.
 * Google redirects here with `?code=...` in the URL. We forward the
 * code to the backend, which does the token exchange with Google and
 * returns our own JWT pair.
 *
 * The auth-code flow (vs implicit/popup) avoids third-party cookie
 * restrictions in modern Chrome — the popup flow randomly failed with
 * "Failed to open popup window" on Vercel deploys.
 */
export default function AuthCallback() {
  const navigate = useNavigate()
  const { setAuth } = useAuth()
  const exchangedRef = useRef(false)

  useEffect(() => {
    // Guard against StrictMode double-invoke (would replay the code twice).
    if (exchangedRef.current) return
    exchangedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const error = params.get('error')

    if (error) {
      toast.error('Google canceló el inicio de sesión. Intentá de nuevo.')
      navigate('/login', { replace: true })
      return
    }

    if (!code) {
      toast.error('Callback inválido. Intentá loguearte de nuevo.')
      navigate('/login', { replace: true })
      return
    }

    const callbackUrl = `${window.location.origin}/auth/callback`

    api
      .post('/auth/google/', { code, callback_url: callbackUrl })
      .then(({ data }) => {
        setAuth(data)
        const target = data.user?.is_profile_complete
          ? '/dashboard'
          : '/completar-perfil'
        navigate(target, { replace: true })
      })
      .catch(() => {
        toast.error('No se pudo iniciar sesión. Intentá de nuevo.')
        navigate('/login', { replace: true })
      })
  }, [navigate, setAuth])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-bg-base">
      <WinnieLogo size="md" />
      <p className="text-sm text-text-secondary">
        Completando inicio de sesión…
      </p>
    </div>
  )
}
