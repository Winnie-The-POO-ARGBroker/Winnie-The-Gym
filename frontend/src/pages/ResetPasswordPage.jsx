import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useParams, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import api from '../services/api'
import WinnieLogo from '../components/ui/WinnieLogo'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

const schema = z
  .object({
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    passwordConfirm: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirm'],
  })

export default function ResetPasswordPage() {
  const { uid, token } = useParams()
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      await api.post('/auth/password/reset/confirm/', {
        uid,
        token,
        new_password1: values.password,
        new_password2: values.passwordConfirm,
      })
      toast.success('Contraseña restablecida exitosamente')
      navigate('/login')
    } catch (err) {
      // dj-rest-auth returns descriptive error objects, e.g.:
      //   { token: ['Invalid value'] }
      //   { new_password2: ['This password is too short.'] }
      const data = err.response?.data
      const message =
        data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : 'No se pudo restablecer la contraseña. El enlace puede haber expirado.'
      toast.error(message)
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
            <h1 className="text-3xl font-bold text-text-primary">Nueva contraseña</h1>
            <p className="text-sm text-text-secondary">
              Elegí una contraseña nueva para tu cuenta.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1">
              <Input
                label="Nueva contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('password')}
              />
              {errors.password && (
                <span className="text-xs text-error-500">{errors.password.message}</span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register('passwordConfirm')}
              />
              {errors.passwordConfirm && (
                <span className="text-xs text-error-500">{errors.passwordConfirm.message}</span>
              )}
            </div>

            <Button type="submit" variant="primary" size="lg" loading={isSubmitting} className="w-full">
              Restablecer contraseña
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
