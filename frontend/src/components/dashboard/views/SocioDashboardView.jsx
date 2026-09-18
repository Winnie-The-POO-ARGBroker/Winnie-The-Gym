import Badge from '../../ui/Badge'
import Button from '../../ui/Button'
import Skeleton from '../../ui/Skeleton'
import {
  useSocioMembership,
  useSocioUpcomingClasses
} from '../../../hooks/queries/useDashboardData'

export default function SocioDashboardView({ navigate }) {
  const { data: membershipData, isLoading: isLoadingMembership } = useSocioMembership()
  const { data: upcomingClasses = [], isLoading: isLoadingClasses } = useSocioUpcomingClasses()

  if (isLoadingMembership) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl animate-pulse">
        <div className="h-64 bg-bg-surface rounded-2xl border border-subtle"></div>
        <div className="h-64 bg-bg-surface rounded-2xl border border-subtle"></div>
      </div>
    )
  }

  const mem = membershipData?.membresia_activa
  const planName = mem?.plan?.nombre || 'Sin membresía activa'
  const expiration = mem?.fecha_fin || '--'
  const hasMedicalCert = !!membershipData?.certificado_medico_url
  let statusBadge = null
  if (!mem) {
    statusBadge = <Badge variant="neutral">Sin membresía</Badge>
  } else if (mem.estado === 'vencida') {
    statusBadge = <Badge variant="danger">Vencida</Badge>
  } else {
    statusBadge = <Badge variant="success">Al día</Badge>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-4xl">
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

        <Button
          variant="primary"
          size="lg"
          onClick={() => navigate('/socio/credencial')}
          className="w-full"
        >
          Ver Mi Credencial QR
        </Button>
      </div>

      <div className="p-6 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-6 shadow-sm">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg text-text-primary">Mis Próximas Clases</h3>
            <Badge variant="live">{upcomingClasses.length} Reservadas</Badge>
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
            ) : upcomingClasses.length === 0 ? (
              <p className="text-xs text-text-secondary">No tienes clases próximas.</p>
            ) : (
              upcomingClasses.map((clase) => (
                <div
                  key={clase.id}
                  className="p-3 rounded-xl bg-bg-raised border border-subtle flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-bold text-text-primary">{clase.nombre}</p>
                    <p className="text-xs text-text-secondary">{clase.instructor_nombre}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md">
                    {clase.hora.slice(0, 5)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={() => navigate('/socio/clases')}
          className="w-full"
        >
          Reservar Nueva Clase
        </Button>
      </div>
    </div>
  )
}

