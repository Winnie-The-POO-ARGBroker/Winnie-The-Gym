import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../services/api'
import WinnieLogo from '../components/ui/WinnieLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
})

export default function ForgotPasswordPage() {
  // Backend uses SafePasswordResetView — always returns 200 to prevent user
  // enumeration. We show a generic success message regardless of whether the
  // email actually exists in the system.
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      setLoading(true)
      await api.post('/auth/password/reset/', { email: values.email })
      setSubmitted(true)
    } catch {
      toast.error('Ocurrió un error. Por favor, intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-bg-base">
      {/* Left promo panel — mirrors LoginPage layout */}
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
            <h1 className="text-3xl font-bold text-text-primary">Recuperar contraseña</h1>
            <p className="text-sm text-text-secondary">
              Ingresá tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>

          {submitted ? (
            <div className="flex flex-col gap-6">
              <div className="rounded-xl p-4 bg-bg-surface border border-subtle">
                <p className="text-sm text-text-primary">
                  Si el email existe, te enviamos un enlace para restablecer tu contraseña. Revisá tu casilla.
                </p>
              </div>
              <Link
                to="/login"
                className="text-sm text-primary hover:underline text-center"
              >
                Volver a inicio de sesión
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1">
                <Input
                  label="Email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  {...register('email')}
                />
                {errors.email && (
                  <span className="text-xs text-error-500">{errors.email.message}</span>
                )}
              </div>

              <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                Enviar enlace
              </Button>

              <Link
                to="/login"
                className="text-sm text-text-secondary hover:text-text-primary text-center transition-colors"
              >
                Volver a inicio de sesión
              </Link>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
