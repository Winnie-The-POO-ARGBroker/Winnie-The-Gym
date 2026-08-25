import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import api from '../services/api'
import useAuthStore from '../stores/authStore'

const schema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellido: z.string().min(2, 'Mínimo 2 caracteres'),
  telefono: z.string().min(8, 'Teléfono inválido'),
})

const rolBadgeVariant = {
  administrador: 'danger',
  recepcionista: 'warning',
  socio: 'success',
}

export default function ProfilePage() {
  const { user, setAuth, accessToken, refreshToken } = useAuthStore()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    api.get('/auth/profile/').then(({ data }) => {
      setProfile(data)
      reset({ nombre: data.nombre, apellido: data.apellido, telefono: data.telefono })
    }).catch(() => {
      toast.error('No se pudo cargar el perfil. Intentá de nuevo.')
    }).finally(() => {
      setLoading(false)
    })
  }, [reset])

  const onSubmit = async (values) => {
    try {
      const { data } = await api.patch('/auth/profile/', values)
      setProfile(data)
      reset({ nombre: data.nombre, apellido: data.apellido, telefono: data.telefono })
      setAuth({
        access: accessToken,
        refresh: refreshToken,
        user: { ...user, nombre: data.nombre, apellido: data.apellido },
      })
      toast.success('Perfil actualizado correctamente.')
    } catch (err) {
      const data = err.response?.data
      const message =
        (data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : data?.detail) ||
        'No se pudo guardar. Intentá de nuevo.'
      toast.error(message)
    }
  }

  const displayName = profile
    ? `${profile.nombre} ${profile.apellido}`
    : (user?.email ?? 'Usuario')

  const rol = profile?.rol ?? user?.rol ?? 'socio'

  if (loading) {
    return (
      <AppLayout>
        <TopBar title="Mi Perfil" subtitle="Información de tu cuenta" />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            <div className="rounded-2xl p-6 flex flex-col items-center gap-4 bg-bg-surface border border-subtle">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex flex-col items-center gap-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-5 w-20 rounded-full mt-1" />
              </div>
            </div>
            <div className="rounded-2xl p-6 flex flex-col gap-5 bg-bg-surface border border-subtle">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-9 w-full" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <TopBar title="Mi Perfil" subtitle="Información de tu cuenta" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto flex flex-col gap-6">

          {/* Identity card */}
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 bg-bg-surface border border-subtle">
            <Avatar name={displayName} src={profile?.foto} size={80} />
            <div className="text-center flex flex-col gap-1">
              <h2 className="text-xl font-bold text-text-primary">
                {displayName}
              </h2>
              <p className="text-sm text-text-secondary">
                {profile?.email ?? user?.email}
              </p>
              <div className="flex justify-center mt-1">
                <Badge variant={rolBadgeVariant[rol] ?? 'success'}>
                  {rol.charAt(0).toUpperCase() + rol.slice(1)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Edit form */}
          <div className="rounded-2xl p-6 flex flex-col gap-5 bg-bg-surface border border-subtle">
            <h3 className="text-base font-semibold text-text-primary">
              Datos personales
            </h3>

            {/* DNI — read only */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                DNI
              </label>
              <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm bg-bg-raised border border-subtle text-text-tertiary">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                {profile?.dni ?? '—'}
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { name: 'nombre', label: 'Nombre' },
                  { name: 'apellido', label: 'Apellido' },
                ].map(({ name, label }) => (
                  <div key={name} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                      {label}
                    </label>
                    <input
                      {...register(name)}
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
                      onFocus={(e) => (e.target.style.borderColor = '#ff5a36'/* brand primary — matches primary in tailwind.config.js */)}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-subtle)')}
                    />
                    {errors[name] && (
                      <span className="text-xs text-error-500">
                        {errors[name].message}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  Teléfono
                </label>
                <input
                  {...register('telefono')}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
                  onFocus={(e) => (e.target.style.borderColor = '#ff5a36')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-subtle)')}
                />
                {errors.telefono && (
                  <span className="text-xs text-error-500">
                    {errors.telefono.message}
                  </span>
                )}
              </div>

              <Button type="submit" variant="primary" size="lg" disabled={!isDirty} loading={isSubmitting} className="w-full">
                Guardar cambios
              </Button>
            </form>
          </div>

        </div>
      </div>
    </AppLayout>
  )
}
