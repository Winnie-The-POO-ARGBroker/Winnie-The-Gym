/**
 * EmailPasswordForm
 *
 * Presents an email + password login form. On success, calls setAuth with
 * the JWT payload returned by dj-rest-auth and navigates the user to the
 * appropriate destination based on is_profile_complete:
 *   - complete → /dashboard
 *   - incomplete → /completar-perfil
 *
 * Props:
 *   onSuccess (optional) — override the default navigation. Called with the
 *   response data object so the parent can redirect however it needs.
 */
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'
import Button from '../ui/Button'
import Input from '../ui/Input'

const schema = z.object({
  email: z.string().email('Ingresá un email válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
})

export default function EmailPasswordForm({ onSuccess }) {
  const { setAuth } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (values) => {
    try {
      setLoading(true)
      const { data } = await api.post('/auth/login/', values)
      setAuth(data)
      toast.success('Sesión iniciada')
      if (onSuccess) {
        onSuccess(data)
      } else {
        navigate(data.user?.is_profile_complete ? '/dashboard' : '/completar-perfil')
      }
    } catch (err) {
      const detail =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Credenciales inválidas'
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  return (
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

      <div className="flex flex-col gap-1">
        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          {...register('password')}
        />
        {errors.password && (
          <span className="text-xs text-error-500">{errors.password.message}</span>
        )}
      </div>

      <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
        Iniciar sesión
      </Button>
    </form>
  )
}
