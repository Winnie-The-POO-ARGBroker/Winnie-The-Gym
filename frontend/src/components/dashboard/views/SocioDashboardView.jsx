import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import Skeleton from '../../ui/Skeleton'
import EstadoBanner from '../../socio/EstadoBanner'
import {
  useSocioMembership,
  useSocioUpcomingClasses
} from '../../../hooks/queries/useDashboardData'
import { getTimeAgo } from '../../../utils/formatDate'
import { AlertCircle, RefreshCw } from 'lucide-react'
import useAuthStore from '../../../stores/authStore'

/**
 * Format a date string as a relative label ("en 5 días", "hace 2 días", "hoy").
 * Uses getTimeAgo for past dates and a simple forward projection for future dates.
 */
function formatRelative(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = date - now
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'hoy'
  if (diffDays === 1) return 'mañana'
  if (diffDays === -1) return 'ayer'
  if (diffDays > 1) return `en ${diffDays} días`
  return getTimeAgo(dateStr)
}

function isTodayBirthday(fechaNacimiento) {
  if (!fechaNacimiento) return false
  const today = new Date()
  const bday = new Date(fechaNacimiento)
  return bday.getMonth() === today.getMonth() && bday.getDate() === today.getDate()
}

export default function SocioDashboardView({ navigate }) {
  const authUser = useAuthStore((s) => s.user)
  const userEstado = authUser?.estado

  const {
    data: membershipData,
    isLoading: isLoadingMembership,
    isError: isMembershipError,
    refetch: refetchMembership,
  } = useSocioMembership()

  const {
    data: upcomingClasses = [],
    isLoading: isLoadingClasses,
    isError: isClassesError,
    refetch: refetchClasses,
  } = useSocioUpcomingClasses()

  if (isLoadingMembership) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl animate-pulse">
        <div className="h-64 bg-bg-surface rounded-2xl border border-subtle"></div>
        <div className="h-64 bg-bg-surface rounded-2xl border border-subtle"></div>
      </div>
    )
  }

  if (isMembershipError) {
    return (
      <div className="flex flex-col items-center gap-4 p-8 text-center max-w-md">
        <AlertCircle className="w-10 h-10 text-error-500" />
        <p className="text-text-primary font-semibold">No se pudo cargar tu membresía.</p>
        <Button variant="secondary" size="sm" onClick={() => refetchMembership()} className="gap-2">
          <RefreshCw className="w-4 h-4" /> Reintentar
        </Button>
      </div>
    )
  }

  const mem = membershipData?.membresia_activa
  const planName = mem?.plan?.nombre || 'Sin membresía activa'
  const expiration = mem?.fecha_fin || '--'
  const hasMedicalCert = !!membershipData?.certificado_medico_url
  const aptoEstado = membershipData?.apto_estado ?? (hasMedicalCert ? 'vigente' : 'sin_apto')
  const aptoVenceEn = membershipData?.certificado_vence_en
  const nombre = membershipData?.nombre || ''
  const fechaNacimiento = membershipData?.fecha_nacimiento
  const isActivo = !userEstado || userEstado === 'activo'

  let statusBadge = null
  if (!mem) {
    statusBadge = <Badge variant="neutral">Sin membresía</Badge>
  } else if (mem.estado === 'vencida') {
    statusBadge = <Badge variant="danger">Vencida</Badge>
  } else {
    statusBadge = <Badge variant="success">Al día</Badge>
  }

  const showBirthdayGreeting = isTodayBirthday(fechaNacimiento)

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      {/* Estado suspendido / baja — always shown when not activo */}
      {!isActivo && (
        <EstadoBanner estado={userEstado} motivo={authUser?.motivo_suspension} />
      )}

      {showBirthdayGreeting && (
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/30 text-primary font-semibold text-center">
          🎂 ¡Feliz cumpleaños, {nombre}!
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-text-secondary uppercase">
                Mi Membresía
              </span>
              <h2 className="text-2xl font-bold text-text-primary mt-1">
                {planName}
              </h2>
              <p className="text-sm text-text-secondary mt-1">
                Vence el {expiration}
                {mem?.fecha_fin && (
                  <span className="ml-1 text-xs text-text-tertiary">
                    ({formatRelative(mem.fecha_fin)})
                  </span>
                )}
              </p>
            </div>
            {statusBadge}
          </div>

          <div className="p-4 rounded-xl bg-bg-raised border border-subtle flex items-center justify-between">
            <div>
              <p className="text-xs text-text-secondary">Apto Médico</p>
              <p className="text-sm font-semibold text-text-primary">
                {hasMedicalCert ? 'Vigente' : 'Faltante'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-secondary">Asistencias este mes</p>
              <p className="text-sm font-bold text-primary">
                {membershipData?.asistencias_mes ?? '--'}
              </p>
            </div>
          </div>

          {/* Apto por vencer warning card */}
          {aptoEstado === 'por_vencer' && aptoVenceEn && (
            <div
              className="flex items-center justify-between p-3 rounded-xl bg-warning-500/10 border border-warning-500/30"
              data-testid="apto-por-vencer-card"
            >
              <div>
                <p className="text-xs font-bold text-warning-500">Tu apto vence el</p>
                <p className="text-sm font-semibold text-text-primary">
                  {new Date(`${aptoVenceEn}T12:00:00`).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/socio/perfil')}
                className="text-xs font-semibold text-warning-500 underline hover:text-warning-400 transition-colors"
              >
                Actualizar
              </button>
            </div>
          )}

          {/* QR CTA — hidden for non-activos */}
          {isActivo ? (
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/socio/credencial')}
              className="w-full"
            >
              Ver Mi Credencial QR
            </Button>
          ) : (
            <div
              className="w-full py-3 px-4 rounded-xl bg-bg-raised border border-subtle text-center text-xs text-text-tertiary"
              title="No disponible mientras tu cuenta no esté activa"
            >
              Credencial QR no disponible
            </div>
          )}
        </div>

        <div className="p-6 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-text-primary">Mis Próximas Clases</h3>
              {!isClassesError && (
                <Badge variant="live">{upcomingClasses.length} Reservadas</Badge>
              )}
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Tu agenda confirmada de actividades.
            </p>

            <div className="flex flex-col gap-3 mt-4">
              {isLoadingClasses ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : isClassesError ? (
                <div className="flex flex-col items-center gap-2 py-4 text-center">
                  <AlertCircle className="w-7 h-7 text-error-500" />
                  <p className="text-xs text-text-secondary">No se pudieron cargar las clases.</p>
                  <Button variant="secondary" size="sm" onClick={() => refetchClasses()} className="gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5" /> Reintentar
                  </Button>
                </div>
              ) : upcomingClasses.length === 0 ? (
                <p className="text-xs text-text-secondary">No tienes clases próximas.</p>
              ) : (
                upcomingClasses.slice(0, 3).map((clase) => (
                  <div
                    key={clase.id}
                    className="p-3 rounded-xl bg-bg-raised border border-subtle flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-bold text-text-primary">{clase.nombre}</p>
                      <p className="text-xs text-text-secondary">
                        {clase.instructor_nombre}
                        {clase.fecha && (
                          <span className="ml-1 text-text-tertiary">
                            · {formatRelative(clase.fecha)}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                      {clase.hora ? clase.hora.slice(0, 5) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {isActivo ? (
            <Button
              variant="secondary"
              size="lg"
              onClick={() => navigate('/socio/clases')}
              className="w-full"
            >
              Reservar Nueva Clase
            </Button>
          ) : (
            <div
              className="w-full py-3 px-4 rounded-xl bg-bg-raised border border-subtle text-center text-xs text-text-tertiary"
              title="No disponible mientras tu cuenta no esté activa"
            >
              Reservas no disponibles
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
