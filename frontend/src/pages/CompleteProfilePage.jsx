import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import useAuth from '../hooks/useAuth'
import api from '../services/api'
import WinnieLogo from '../components/ui/WinnieLogo'
import Button from '../components/ui/Button'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellido: z.string().min(2, 'Mínimo 2 caracteres'),
  dni: z.string().regex(/^\d{7,8}$/, 'DNI inválido (7 u 8 dígitos)'),
  telefono: z.string().min(8, 'Teléfono inválido'),
})

const FIELDS = [
  { name: 'nombre', label: 'Nombre', placeholder: 'Juan' },
  { name: 'apellido', label: 'Apellido', placeholder: 'García' },
  { name: 'dni', label: 'DNI', placeholder: '12345678' },
  { name: 'telefono', label: 'Teléfono', placeholder: '+54 11 1234 5678' },
]

export default function CompleteProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuth()
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) })

  const completeProfile = useMutation({
    mutationFn: (values) => api.post('/auth/complete-profile/', values).then((r) => r.data),
    onSuccess: () => {
      setAuth({
        access: accessToken,
        refresh: refreshToken,
        user: { ...user, is_profile_complete: true },
      })
      navigate('/dashboard')
    },
    onError: (err) => {
      const data = err.response?.data
      const message =
        (data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : data?.detail) ||
        'No se pudo guardar el perfil. Intentá de nuevo.'
      toast.error(message)
    },
  })

  const onSubmit = (values) => {
    completeProfile.mutate(values)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg-base">
      <div className="rounded-2xl p-8 w-full max-w-sm flex flex-col gap-6 bg-bg-surface border border-subtle">
        <div className="flex justify-center">
          <WinnieLogo size="sm" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-text-primary">Completá tu perfil</h1>
          <p className="text-sm mt-1 text-text-secondary">
            Necesitamos algunos datos más para continuar.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {FIELDS.map(({ name, label, placeholder }) => (
            <div key={name} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">{label}</label>
              <input
                {...register(name)}
                placeholder={placeholder}
                className="rounded-lg px-3 py-2.5 text-text-primary text-sm outline-none appearance-none placeholder:text-text-tertiary bg-bg-raised border border-subtle"
              />
              {errors[name] && (
                <span className="text-xs text-error-500">
                  {errors[name].message}
                </span>
              )}
            </div>
          ))}

          <Button type="submit" variant="primary" size="lg" loading={completeProfile.isPending} className="w-full mt-2">
            Continuar
          </Button>
        </form>
      </div>
    </div>
  )
}
