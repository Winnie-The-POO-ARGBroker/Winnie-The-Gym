import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { AlertCircle, Lock, RefreshCw } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import ChangePasswordModal from '../components/auth/ChangePasswordModal'
import useAuth from '../hooks/useAuth'
import { useProfile, useUpdateProfile, PROFILE_KEY } from '../hooks/queries/useProfile'
import { MEMBRESIAS_QUERY_KEYS } from '../hooks/queries/useMembresias'
import CertificadoCard from '../components/socio/CertificadoCard'

// ─── Schemas ──────────────────────────────────────────────────────────────────

const socioSchema = z.object({
  nombre: z.string().min(2, 'Mínimo 2 caracteres'),
  apellido: z.string().min(2, 'Mínimo 2 caracteres'),
  telefono: z.string().min(8, 'Teléfono inválido'),
  fecha_nacimiento: z.string().optional().nullable(),
  genero: z.enum(['F', 'M', 'X', 'N', '']).optional().nullable(),
  contacto_emergencia_nombre: z.string().optional().nullable(),
  contacto_emergencia_telefono: z.string().optional().nullable(),
})

const staffSchema = z.object({
  first_name: z.string().min(1, 'Nombre requerido'),
  last_name: z.string().min(1, 'Apellido requerido'),
})

const rolBadgeVariant = {
  administrador: 'danger',
  recepcionista: 'warning',
  socio: 'success',
}

// ─── Error card ───────────────────────────────────────────────────────────────

function ProfileErrorCard({ onRetry }) {
  return (
    <AppLayout>
      <TopBar title="Mi Perfil" subtitle="Información de tu cuenta" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="rounded-2xl p-6 flex flex-col items-center gap-4 bg-bg-surface border border-subtle text-center">
            <AlertCircle className="w-10 h-10 text-error-500" />
            <p className="text-text-primary font-semibold">
              No se pudo cargar el perfil.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onRetry}
              className="gap-2"
              data-testid="retry-button"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// ─── Staff profile view ───────────────────────────────────────────────────────

function StaffProfileView({ profile, user, isChangePwdOpen, setIsChangePwdOpen }) {
  const updateProfile = useUpdateProfile()
  const { setAuth, accessToken, refreshToken } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      first_name: profile?.first_name ?? '',
      last_name: profile?.last_name ?? '',
    },
  })

  useEffect(() => {
    if (profile) {
      reset({ first_name: profile.first_name ?? '', last_name: profile.last_name ?? '' })
    }
  }, [profile, reset])

  const onSubmit = async (values) => {
    try {
      const data = await updateProfile.mutateAsync(values)
      reset({ first_name: data.first_name, last_name: data.last_name })
      setAuth({
        access: accessToken,
        refresh: refreshToken,
        user: { ...user, first_name: data.first_name, last_name: data.last_name },
      })
      toast.success('Perfil actualizado correctamente.')
    } catch (err) {
      const errData = err.response?.data
      const message =
        (errData && typeof errData === 'object'
          ? Object.values(errData).flat().join(' ')
          : errData?.detail) ||
        'No se pudo guardar. Intentá de nuevo.'
      toast.error(message)
    }
  }

  const rol = profile?.rol ?? user?.rol ?? 'administrador'
  const displayName =
    (profile?.first_name || profile?.last_name)
      ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
      : profile?.email ?? user?.email ?? 'Staff'

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Identity card */}
      <div className="rounded-2xl p-6 flex flex-col items-center gap-4 bg-bg-surface border border-subtle">
        <Avatar name={displayName} src={profile?.foto} size={80} />
        <div className="text-center flex flex-col gap-1">
          <h2 className="text-xl font-bold text-text-primary">{displayName}</h2>
          <p className="text-sm text-text-secondary">{profile?.email ?? user?.email}</p>
          <div className="flex justify-center mt-1">
            <Badge variant={rolBadgeVariant[rol] ?? 'warning'}>
              {rol.charAt(0).toUpperCase() + rol.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Security — change password */}
      <div className="rounded-2xl p-6 flex flex-col gap-4 bg-bg-surface border border-subtle">
        <h3 className="text-base font-semibold text-text-primary">Seguridad</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsChangePwdOpen(true)}
          className="gap-2 w-fit"
        >
          <Lock className="w-4 h-4" />
          Cambiar contraseña
        </Button>
      </div>

      <ChangePasswordModal isOpen={isChangePwdOpen} onClose={() => setIsChangePwdOpen(false)} />

      {/* Edit form */}
      <div className="rounded-2xl p-6 flex flex-col gap-5 bg-bg-surface border border-subtle">
        <h3 className="text-base font-semibold text-text-primary">Datos personales</h3>

        {/* Email — read-only */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
            Email
          </label>
          <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm bg-bg-raised border border-subtle text-text-tertiary">
            {profile?.email ?? user?.email ?? '—'}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { name: 'first_name', label: 'Nombre' },
              { name: 'last_name', label: 'Apellido' },
            ].map(({ name, label }) => (
              <div key={name} className="flex flex-col gap-1.5">
                <label htmlFor={`profile-${name}`} className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  {label}
                </label>
                <input
                  id={`profile-${name}`}
                  {...register(name)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
                  onFocus={(e) => (e.target.style.borderColor = '#ff5a36')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-subtle)')}
                />
                {errors[name] && (
                  <span className="text-xs text-error-500">{errors[name].message}</span>
                )}
              </div>
            ))}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={!isDirty}
            loading={isSubmitting}
            className="w-full"
          >
            Guardar cambios
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Socio profile view (existing logic, unchanged) ───────────────────────────

function SocioProfileView({ profile, user, isChangePwdOpen, setIsChangePwdOpen, refetchProfile: _refetchProfile }) {
  const updateProfile = useUpdateProfile()
  const queryClient = useQueryClient()
  const { setAuth, accessToken, refreshToken } = useAuth()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(socioSchema),
  })

  useEffect(() => {
    if (profile) {
      reset({
        nombre: profile.nombre,
        apellido: profile.apellido,
        telefono: profile.telefono,
        fecha_nacimiento: profile.fecha_nacimiento ?? '',
        genero: profile.genero ?? '',
        contacto_emergencia_nombre: profile.contacto_emergencia_nombre ?? '',
        contacto_emergencia_telefono: profile.contacto_emergencia_telefono ?? '',
      })
    }
  }, [profile, reset])

  const onSubmit = async (values) => {
    try {
      const data = await updateProfile.mutateAsync(values)
      reset({
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        fecha_nacimiento: data.fecha_nacimiento ?? '',
        genero: data.genero ?? '',
        contacto_emergencia_nombre: data.contacto_emergencia_nombre ?? '',
        contacto_emergencia_telefono: data.contacto_emergencia_telefono ?? '',
      })
      setAuth({
        access: accessToken,
        refresh: refreshToken,
        user: { ...user, nombre: data.nombre, apellido: data.apellido },
      })
      toast.success('Perfil actualizado correctamente.')
    } catch (err) {
      const errData = err.response?.data
      const message =
        (errData && typeof errData === 'object'
          ? Object.values(errData).flat().join(' ')
          : errData?.detail) ||
        'No se pudo guardar. Intentá de nuevo.'
      toast.error(message)
    }
  }

  const handleCertUploadSuccess = () => {
    toast.success('Certificado subido correctamente.')
    queryClient.invalidateQueries({ queryKey: PROFILE_KEY })
    queryClient.invalidateQueries({ queryKey: MEMBRESIAS_QUERY_KEYS.me })
    // Socio dashboard reads /memberships/me/ under its own key
    queryClient.invalidateQueries({ queryKey: ['socioMembership'] })
  }

  const displayName = profile
    ? `${profile.nombre} ${profile.apellido}`
    : (user?.email ?? 'Usuario')

  const rol = profile?.rol ?? user?.rol ?? 'socio'

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Identity card */}
      <div className="rounded-2xl p-6 flex flex-col items-center gap-4 bg-bg-surface border border-subtle">
        <Avatar name={displayName} src={profile?.foto} size={80} />
        <div className="text-center flex flex-col gap-1">
          <h2 className="text-xl font-bold text-text-primary">{displayName}</h2>
          <p className="text-sm text-text-secondary">{profile?.email ?? user?.email}</p>
          <div className="flex justify-center mt-1">
            <Badge variant={rolBadgeVariant[rol] ?? 'success'}>
              {rol.charAt(0).toUpperCase() + rol.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Certificado médico */}
      <CertificadoCard
        socioId={profile?.id}
        aptoEstado={profile?.apto_estado ?? 'sin_apto'}
        certificadoEmitidoEn={profile?.certificado_emitido_en ?? null}
        certificadoVenceEn={profile?.certificado_vence_en ?? null}
        onUploadSuccess={handleCertUploadSuccess}
      />

      {/* Security */}
      <div className="rounded-2xl p-6 flex flex-col gap-4 bg-bg-surface border border-subtle">
        <h3 className="text-base font-semibold text-text-primary">Seguridad</h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsChangePwdOpen(true)}
          className="gap-2 w-fit"
        >
          <Lock className="w-4 h-4" />
          Cambiar contraseña
        </Button>
      </div>

      <ChangePasswordModal isOpen={isChangePwdOpen} onClose={() => setIsChangePwdOpen(false)} />

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
                <label htmlFor={`profile-${name}`} className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                  {label}
                </label>
                <input
                  id={`profile-${name}`}
                  {...register(name)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
                  onFocus={(e) => (e.target.style.borderColor = '#ff5a36')}
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
            <label htmlFor="profile-telefono" className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
              Teléfono
            </label>
            <input
              id="profile-telefono"
              {...register('telefono')}
              inputMode="tel"
              autoComplete="tel"
              className="w-full px-3 py-2 rounded-lg text-base md:text-sm min-h-11 outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
              onFocus={(e) => (e.target.style.borderColor = '#ff5a36')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-subtle)')}
            />
            {errors.telefono && (
              <span className="text-xs text-error-500">
                {errors.telefono.message}
              </span>
            )}
          </div>

          {/* Extended fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-fecha-nacimiento" className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Fecha de nacimiento
              </label>
              <input
                id="profile-fecha-nacimiento"
                {...register('fecha_nacimiento')}
                type="date"
                data-testid="fecha-nacimiento-input"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
                onFocus={(e) => (e.target.style.borderColor = '#ff5a36')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-subtle)')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-genero" className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Género
              </label>
              <select
                id="profile-genero"
                {...register('genero')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary cursor-pointer"
              >
                <option value="">Sin especificar</option>
                <option value="F">Femenino</option>
                <option value="M">Masculino</option>
                <option value="X">No binario</option>
                <option value="N">Prefiero no decir</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-contacto-emergencia-nombre" className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Contacto emergencia — Nombre
              </label>
              <input
                id="profile-contacto-emergencia-nombre"
                {...register('contacto_emergencia_nombre')}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
                placeholder="Nombre del contacto"
                onFocus={(e) => (e.target.style.borderColor = '#ff5a36')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-subtle)')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="profile-contacto-emergencia-telefono" className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Contacto emergencia — Teléfono
              </label>
              <input
                id="profile-contacto-emergencia-telefono"
                {...register('contacto_emergencia_telefono')}
                inputMode="tel"
                data-testid="contacto-emergencia-telefono-input"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base appearance-none transition-colors bg-bg-raised border border-subtle text-text-primary placeholder:text-text-tertiary"
                placeholder="+54 9 351 ..."
                onFocus={(e) => (e.target.style.borderColor = '#ff5a36')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--color-border-subtle)')}
              />
            </div>
          </div>

          <Button type="submit" variant="primary" size="lg" disabled={!isDirty} loading={isSubmitting} className="w-full">
            Guardar cambios
          </Button>
        </form>
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth()
  const { data: profile, isPending: loading, isError, refetch } = useProfile()
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false)

  // Determine if socio based on profile discriminator or user.rol fallback
  const isSocio = profile
    ? !profile.is_staff_profile
    : user?.rol === 'socio'

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

  if (isError) {
    return <ProfileErrorCard onRetry={refetch} />
  }

  return (
    <AppLayout>
      <TopBar title="Mi Perfil" subtitle="Información de tu cuenta" />
      <div className="flex-1 overflow-auto p-6">
        {isSocio ? (
          <SocioProfileView
            profile={profile}
            user={user}
            isChangePwdOpen={isChangePwdOpen}
            setIsChangePwdOpen={setIsChangePwdOpen}
            refetchProfile={refetch}
          />
        ) : (
          <StaffProfileView
            profile={profile}
            user={user}
            isChangePwdOpen={isChangePwdOpen}
            setIsChangePwdOpen={setIsChangePwdOpen}
          />
        )}
      </div>
    </AppLayout>
  )
}
