import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { FileCheck, FileX, Lock, Upload } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import Avatar from '../components/ui/Avatar'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Skeleton from '../components/ui/Skeleton'
import ChangePasswordModal from '../components/auth/ChangePasswordModal'
import useAuth from '../hooks/useAuth'
import { useProfile, useUpdateProfile } from '../hooks/queries/useProfile'
import api from '../services/api'

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
  const { user, setAuth, accessToken, refreshToken } = useAuth()
  const { data: profile, isPending: loading, refetch: refetchProfile } = useProfile()
  const updateProfile = useUpdateProfile()
  const [isChangePwdOpen, setIsChangePwdOpen] = useState(false)
  const [uploadingCert, setUploadingCert] = useState(false)
  const certInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (profile) {
      reset({ nombre: profile.nombre, apellido: profile.apellido, telefono: profile.telefono })
    }
  }, [profile, reset])

  const onSubmit = async (values) => {
    try {
      const data = await updateProfile.mutateAsync(values)
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

  const handleCertUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !profile?.id) return
    setUploadingCert(true)
    const formData = new FormData()
    formData.append('archivo', file)
    try {
      await api.post(`/members/socios/${profile.id}/certificado-medico/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Certificado médico actualizado.')
      refetchProfile()
    } catch (err) {
      const data = err?.response?.data
      const message =
        data && typeof data === 'object'
          ? Object.values(data).flat().join(' ')
          : (data?.detail ?? 'No se pudo subir el certificado.')
      toast.error(message)
    } finally {
      setUploadingCert(false)
      if (certInputRef.current) certInputRef.current.value = ''
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

          {/* Certificado médico — only for socios */}
          {rol === 'socio' && (
            <div className="rounded-2xl p-6 flex flex-col gap-4 bg-bg-surface border border-subtle">
              <h3 className="text-base font-semibold text-text-primary">Certificado médico</h3>

              {profile?.certificado_medico_url ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-success-500/10 border border-success-500/20 text-success-500">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileCheck className="w-4 h-4" />
                    <span>Certificado cargado</span>
                  </div>
                  <a
                    href={profile.certificado_medico_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold underline"
                  >
                    Ver archivo
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-error-500/10 border border-error-500/20 text-error-500 text-sm font-medium">
                  <FileX className="w-4 h-4" />
                  <span>No hay certificado cargado</span>
                </div>
              )}

              <input
                ref={certInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleCertUpload}
                data-testid="cert-file-input"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={uploadingCert}
                onClick={() => certInputRef.current?.click()}
                className="gap-2 w-fit"
              >
                <Upload className="w-4 h-4" />
                {profile?.certificado_medico_url ? 'Reemplazar certificado' : 'Subir certificado'}
              </Button>
            </div>
          )}

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
