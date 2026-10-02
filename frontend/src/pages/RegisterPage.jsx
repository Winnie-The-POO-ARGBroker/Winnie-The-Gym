import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import useAuth from '../hooks/useAuth'
import api from '../services/api'
import WinnieLogo from '../components/ui/WinnieLogo'
import Button from '../components/ui/Button'

const schema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    password_confirm: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    nombre: z.string().min(2, 'Mínimo 2 caracteres'),
    apellido: z.string().min(2, 'Mínimo 2 caracteres'),
    dni: z.string().regex(/^\d{7,8}$/, 'DNI inválido (7 u 8 dígitos numéricos)'),
    telefono: z.string().optional().or(z.literal('')),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['password_confirm'],
  })

export default function RegisterPage() {
  const { setAuth } = useAuth()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      // Step 1: register user — receives access + refresh + user
      const registerRes = await api.post('/auth/registration/register/', {
        email: values.email,
        password1: values.password,
        password2: values.password_confirm,
      })

      const { access, refresh, user } = registerRes.data
      setAuth({ access, refresh, user })

      // Step 2: complete socio profile with the JWT already set
      try {
        await api.post('/auth/complete-profile/', {
          nombre: values.nombre,
          apellido: values.apellido,
          dni: values.dni,
          telefono: values.telefono || '',
        })
      } catch (profileErr) {
        const profileData = profileErr.response?.data
        if (profileErr.response?.status === 400 && profileData?.dni) {
          setError('dni', {
            type: 'server',
            message: Array.isArray(profileData.dni) ? profileData.dni[0] : profileData.dni,
          })
          return
        }
        const msg =
          (profileData && typeof profileData === 'object'
            ? Object.values(profileData).flat().join(' ')
            : profileData?.detail) || 'No se pudo guardar el perfil. Intentá de nuevo.'
        toast.error(msg)
        return
      }

      toast.success('¡Cuenta creada exitosamente! Bienvenido/a.')
      navigate('/dashboard')
    } catch (err) {
      const data = err.response?.data

      if (err.response?.status === 400) {
        // Handle email duplicate or password validation errors from registration
        if (data?.email) {
          setError('email', {
            type: 'server',
            message: Array.isArray(data.email) ? data.email[0] : data.email,
          })
        }
        if (data?.password1 || data?.non_field_errors) {
          const msgs = [
            ...(data?.password1 ?? []),
            ...(data?.non_field_errors ?? []),
          ]
          if (msgs.length > 0) {
            setError('password', { type: 'server', message: msgs[0] })
          }
        }
        // Show a generic toast only if we couldn't map to a specific field
        if (!data?.email && !data?.password1 && !data?.non_field_errors) {
          const msg =
            (data && typeof data === 'object'
              ? Object.values(data).flat().join(' ')
              : data?.detail) || 'Error al registrarse. Revisá los datos e intentá de nuevo.'
          toast.error(msg)
        }
        return
      }

      toast.error('Error de red. Revisá tu conexión e intentá de nuevo.')
    }
  }

  return (
    <div className="min-h-screen flex bg-bg-base">
      {/* Left promo panel */}
      <div className="hidden md:flex flex-col justify-between p-8 bg-bg-surface" style={{ width: '45%' }}>
        <WinnieLogo size="sm" />

        <div className="flex flex-col gap-4">
          <h2 className="text-4xl font-bold text-white leading-tight">
            Unite al gimnasio,<br />sin complicaciones.
          </h2>
          <p className="text-base leading-relaxed text-text-tertiary">
            Creá tu cuenta en segundos y empezá a disfrutar de todas las clases, seguí tu membresía y mucho más desde un solo lugar.
          </p>
        </div>

        <img
          src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80"
          alt="Gym"
          className="w-full object-cover rounded-2xl"
          style={{ maxHeight: 280 }}
        />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-8 bg-bg-base">
        <div className="w-full max-w-sm flex flex-col gap-6">
          {/* Mobile logo */}
          <div className="flex md:hidden justify-center">
            <WinnieLogo size="md" />
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-bold text-text-primary">Crear cuenta</h1>
            <p className="text-sm text-text-secondary">
              Completá tus datos para registrarte como socio
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="tu@email.com"
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors.email && (
                <span className="text-xs text-error-500">{errors.email.message}</span>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Contraseña</label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors.password && (
                <span className="text-xs text-error-500">{errors.password.message}</span>
              )}
            </div>

            {/* Password confirm */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Confirmar contraseña</label>
              <input
                {...register('password_confirm')}
                type="password"
                placeholder="••••••••"
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors.password_confirm && (
                <span className="text-xs text-error-500">{errors.password_confirm.message}</span>
              )}
            </div>

            {/* Nombre */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Nombre</label>
              <input
                {...register('nombre')}
                placeholder="Juan"
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors.nombre && (
                <span className="text-xs text-error-500">{errors.nombre.message}</span>
              )}
            </div>

            {/* Apellido */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Apellido</label>
              <input
                {...register('apellido')}
                placeholder="García"
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors.apellido && (
                <span className="text-xs text-error-500">{errors.apellido.message}</span>
              )}
            </div>

            {/* DNI */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">DNI</label>
              <input
                {...register('dni')}
                placeholder="12345678"
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors.dni && (
                <span className="text-xs text-error-500">{errors.dni.message}</span>
              )}
            </div>

            {/* Telefono (optional) */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">
                Teléfono <span className="text-text-tertiary font-normal">(opcional)</span>
              </label>
              <input
                {...register('telefono')}
                placeholder="+54 11 1234 5678"
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors.telefono && (
                <span className="text-xs text-error-500">{errors.telefono.message}</span>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={isSubmitting}
              className="w-full mt-2"
            >
              Crear cuenta
            </Button>
          </form>

          {/* Divider + login link */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
            <span className="text-xs whitespace-nowrap text-text-secondary">o</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--color-border-subtle)' }} />
          </div>

          <Link
            to="/login"
            className="text-sm text-text-secondary hover:text-text-primary text-center transition-colors"
          >
            ¿Ya tenés cuenta? Iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  )
}
