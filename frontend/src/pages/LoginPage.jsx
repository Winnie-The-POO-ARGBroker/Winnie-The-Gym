import { useState } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import useAuth from '../hooks/useAuth'
import WinnieLogo from '../components/ui/WinnieLogo'
import Button from '../components/ui/Button'
import api from '../services/api'
import EmailPasswordForm from '../components/auth/EmailPasswordForm'

export default function LoginPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [loadingRol, setLoadingRol] = useState(null)

  // auth-code flow with same-tab redirect. Avoids the "Failed to open popup"
  // error caused by Chrome's third-party cookie restrictions on the implicit
  // popup flow. Token exchange happens in AuthCallback + backend.
  const login = useGoogleLogin({
    flow: 'auth-code',
    ux_mode: 'redirect',
    redirect_uri: `${window.location.origin}/auth/callback`,
  })

  const handleDevLogin = async (rol) => {
    setLoadingRol(rol)
    try {
      const res = await api.post('/auth/dev-login/', { rol })
      setAuth({
        access: res.data.access,
        refresh: res.data.refresh,
        user: res.data.user,
      })
      if (rol === 'socio') {
        navigate('/socio/credencial')
      } else {
        navigate('/dashboard')
      }
      toast.success(`Sesión iniciada como ${res.data.user.rol}`)
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        'El login de dev no está disponible (solo en modo desarrollo)'
      toast.error(errorMsg)
      console.error('Dev login error:', err)
    } finally {
      setLoadingRol(null)
    }
  }

  return (
    <div className="min-h-screen flex bg-bg-base">
      {/* Left promo panel */}
      <div className="hidden md:flex flex-col justify-between p-8 bg-bg-surface" style={{ width: '45%' }}>
        <WinnieLogo size="sm" />

        <div className="flex flex-col gap-4">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Tu gimnasio,<br />sin el caos.
          </h2>
          <p className="text-base leading-relaxed text-text-tertiary">
            Socios, clases y accesos en tiempo real. Todo desde un solo lugar, para que te enfoques en lo que importa.
          </p>
        </div>

        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80"
          alt="Gym"
          className="w-full object-cover rounded-2xl"
          style={{ maxHeight: 280 }}
        />
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex items-center justify-center px-6 bg-bg-base">
        <div className="w-full max-w-sm flex flex-col gap-8">
          {/* Mobile logo */}
          <div className="flex md:hidden justify-center">
            <WinnieLogo size="md" />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-text-primary">Bienvenido</h1>
            <p className="text-sm text-text-secondary">
              Inicia sesión para continuar
            </p>
          </div>

          {/* Canonical Google sign-in button style — intentionally fixed white */}
          <button
            onClick={() => login()}
            className="w-full flex items-center justify-center gap-3 rounded-xl py-3 px-4 font-semibold text-gray-800 transition-opacity hover:opacity-90 shadow-md bg-white"
          >
            {/* Google logo SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path
                fill="#FFC107"
                d="M43.6 20H24v8h11.3C33.6 32.8 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.7 6.5 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-9 20-20 0-1.3-.1-2.7-.4-4z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3 0 5.7 1.1 7.8 2.9l5.7-5.7C33.7 6.5 29.1 4 24 4 16.2 4 9.4 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5 0 9.6-1.9 13-5l-6-5.2C29.2 35.4 26.7 36 24 36c-5.1 0-9.5-3.2-11.2-7.7L6.1 33.5C9.2 39.7 16 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20H24v8h11.3c-.7 2-2 3.8-3.7 5l6 5.2C41 34.5 44 29.7 44 24c0-1.3-.1-2.7-.4-4z"
              />
            </svg>
            Continuar con Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
            <span className="text-xs whitespace-nowrap text-text-secondary">
              o continuá con
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
          </div>

          {/* Email / password login */}
          <EmailPasswordForm />

          {/* Forgot password link */}
          <Link
            to="/forgot-password"
            className="text-sm text-text-secondary hover:text-text-primary text-center transition-colors -mt-4"
          >
            ¿Olvidaste tu contraseña?
          </Link>

          {/* Register link */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
            <span className="text-xs whitespace-nowrap text-text-secondary">o</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
          </div>

          <Link
            to="/registro"
            className="text-sm text-text-secondary hover:text-text-primary text-center transition-colors"
          >
            ¿No tenés cuenta? Crear cuenta
          </Link>

          {import.meta.env.DEV && <>
            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
              <span className="text-xs whitespace-nowrap text-text-secondary">
                o acceso rápido demo
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
            </div>

            {/* Quick Demo Logins */}
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => handleDevLogin('administrador')}
                loading={loadingRol === 'administrador'}
                className="w-full gap-2 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                👑 Ingresar como Administrador
              </Button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loadingRol !== null}
                  onClick={() => handleDevLogin('recepcionista')}
                  className="py-2 px-3 rounded-xl bg-bg-raised hover:bg-bg-surface border border-subtle text-text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingRol === 'recepcionista' ? 'Ingresando...' : '📋 Recepcionista'}
                </button>

                <button
                  type="button"
                  disabled={loadingRol !== null}
                  onClick={() => handleDevLogin('socio')}
                  className="py-2 px-3 rounded-xl bg-bg-raised hover:bg-bg-surface border border-subtle text-text-primary text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  {loadingRol === 'socio' ? 'Ingresando...' : '💳 Socio (Portal)'}
                </button>
              </div>
            </div>
          </>}
        </div>
      </div>
    </div>
  )
}
