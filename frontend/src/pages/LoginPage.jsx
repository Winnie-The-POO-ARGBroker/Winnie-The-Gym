import { useGoogleLogin } from '@react-oauth/google'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import useAuthStore from '../stores/authStore'
import api from '../services/api'
import WinnieLogo from '../components/ui/WinnieLogo'

export default function LoginPage() {
  const { setAuth } = useAuthStore()
  const navigate = useNavigate()

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const { data } = await api.post('/auth/google/', {
          access_token: tokenResponse.access_token,
        })
        setAuth(data)
        if (data.user?.is_profile_complete) {
          navigate('/dashboard')
        } else {
          navigate('/completar-perfil')
        }
      } catch {
        toast.error('No se pudo iniciar sesión. Intentá de nuevo.')
      }
    },
    onError: () => toast.error('Error al conectar con Google. Intentá de nuevo.'),
  })

  return (
    <div className="min-h-screen flex bg-bg-base">
      {/* Left promo panel */}
      <div className="hidden md:flex flex-col justify-between p-8 bg-bg-surface" style={{ width: '45%' }}>
        <WinnieLogo size="sm" />

        <div className="flex flex-col gap-4">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Tu gimnasio,<br />sin el caos.
          </h2>
          <p className="text-base leading-relaxed text-neutral-400">
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

          {/* Quick Demo Logins (Solo en entorno de desarrollo) */}
          {import.meta.env.DEV && (
            <>
              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
                <span className="text-xs whitespace-nowrap text-text-secondary">
                  o acceso rápido demo (DEV)
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => {
                    setAuth({
                      access: 'mock-access-token-admin',
                      refresh: 'mock-refresh-token',
                      user: {
                        id: 1,
                        email: 'admin@winniegym.com',
                        nombre: 'Rodrigo',
                        apellido: 'Valdez',
                        rol: 'administrador',
                        is_profile_complete: true,
                      },
                    })
                    navigate('/dashboard')
                    toast.success('Sesión iniciada como Administrador')
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
                >
                  👑 Ingresar como Administrador
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setAuth({
                        access: 'mock-access-token-recep',
                        refresh: 'mock-refresh-token',
                        user: {
                          id: 2,
                          email: 'recep@winniegym.com',
                          nombre: 'Magali',
                          apellido: 'Bechis',
                          rol: 'recepcionista',
                          is_profile_complete: true,
                        },
                      })
                      navigate('/dashboard')
                      toast.success('Sesión iniciada como Recepcionista')
                    }}
                    className="py-2 px-3 rounded-xl bg-bg-raised hover:bg-bg-surface border border-subtle text-text-primary text-xs font-semibold transition-colors"
                  >
                    📋 Recepcionista
                  </button>

                  <button
                    onClick={() => {
                      setAuth({
                        access: 'mock-access-token-socio',
                        refresh: 'mock-refresh-token',
                        user: {
                          id: 3,
                          email: 'socio@winniegym.com',
                          nombre: 'Martín',
                          apellido: 'Bossi',
                          rol: 'socio',
                          is_profile_complete: true,
                        },
                      })
                      navigate('/socio/credencial')
                      toast.success('Sesión iniciada como Socio')
                    }}
                    className="py-2 px-3 rounded-xl bg-bg-raised hover:bg-bg-surface border border-subtle text-text-primary text-xs font-semibold transition-colors"
                  >
                    💳 Socio (Portal)
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
