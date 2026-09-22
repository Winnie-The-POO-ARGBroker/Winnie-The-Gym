import AforoCard from '../AforoCard'
import MovementList from '../MovementList'
import AlertList from '../AlertList'
import ClassCapacityList from '../ClassCapacityList'
import {
  useAccessLogs,
  useDashboardAlerts,
  useDashboardClasses,
  mapAccessLog,
  useAforoStats
} from '../../../hooks/queries/useDashboardData'
import useWebSocket from '../../../hooks/useWebSocket'
import { useGymConfig } from '../../../hooks/queries/useGymConfig'

export default function AdminDashboardView() {
  const { data: logsData = [], isLoading: isLoadingLogs, isError: isErrorLogs } = useAccessLogs(5)
  const { data: alertsData = [], isLoading: isLoadingAlerts, isError: isErrorAlerts } = useDashboardAlerts()
  const { data: classesData = [], isLoading: isLoadingClasses, isError: isErrorClasses } = useDashboardClasses()

  const { lastMessage, isConnecting } = useWebSocket('/ws/aforo/')
  const { data: restStats } = useAforoStats()
  const { data: gymConfig } = useGymConfig()

  const aforoActual = lastMessage?.aforo_actual ?? restStats?.aforo_actual ?? 0
  const ingresosHoy = lastMessage?.ingresos_hoy ?? restStats?.ingresos_hoy ?? 0
  const egresosHoy = lastMessage?.egresos_hoy ?? restStats?.egresos_hoy ?? 0

  const mappedMovements = logsData.map(mapAccessLog)

  const mappedAlerts = alertsData.map(mem => ({
    id: mem.id,
    name: mem.socio_nombre ? `${mem.socio_nombre} ${mem.socio_apellido || ''}`.trim() : 'Desconocido',
    tag: mem.estado === 'vencida' ? 'Vencida' : 'Pendiente'
  }))

  const mappedClasses = classesData.map(c => ({
    id: c.id,
    name: c.nombre,
    current: c.cupos_reservados || 0,
    max: c.cupo_maximo
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
      <div className="flex flex-col gap-6">
        <AforoCard
          current={aforoActual}
          max={gymConfig?.aforo_maximo ?? 200}
          entries={ingresosHoy}
          exits={egresosHoy}
          loading={isConnecting && !lastMessage && restStats === undefined}
        />
        {isErrorLogs ? <p className="text-danger text-sm">Error al cargar movimientos.</p> : <MovementList movements={mappedMovements} loading={isLoadingLogs} />}
      </div>

      <div className="flex flex-col gap-6">
        {isErrorAlerts ? <p className="text-danger text-sm">Error al cargar alertas.</p> : <AlertList alerts={mappedAlerts} loading={isLoadingAlerts} />}
        {isErrorClasses ? <p className="text-danger text-sm">Error al cargar clases.</p> : <ClassCapacityList classes={mappedClasses} loading={isLoadingClasses} />}
      </div>
    </div>
  )
}
