import AforoCard from '../AforoCard'
import MovementList from '../MovementList'
import AlertList from '../AlertList'
import ClassCapacityList from '../ClassCapacityList'
import {
  useAccessLogs,
  useDashboardAlerts,
  useDashboardClasses
} from '../../../hooks/queries/useDashboardData'
import useWebSocket from '../../../hooks/useWebSocket'

export default function AdminDashboardView({ navigate }) {
  const { data: logsData = [], isLoading: isLoadingLogs } = useAccessLogs(5)
  const { data: alertsData = [], isLoading: isLoadingAlerts } = useDashboardAlerts()
  const { data: classesData = [], isLoading: isLoadingClasses } = useDashboardClasses()

  const { lastMessage, isConnected } = useWebSocket('/ws/aforo/')
  
  const aforoActual = lastMessage?.aforo_actual ?? 0
  const ingresosHoy = lastMessage?.ingresos_hoy ?? 0
  const egresosHoy = lastMessage?.egresos_hoy ?? 0

  const mappedMovements = logsData.map(log => {
    const d = new Date(log.timestamp)
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return {
      id: log.id,
      name: log.user_nombre ? `${log.user_nombre} ${log.user_apellido || ''}`.trim() : 'Desconocido',
      membership: log.user_plan_nombre || 'Sin plan',
      time: timeStr,
      type: log.access_type
    }
  })

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
          max={200} 
          entries={ingresosHoy} 
          exits={egresosHoy} 
          loading={!isConnected && !lastMessage}
        />
        <MovementList movements={mappedMovements} loading={isLoadingLogs} />
      </div>

      <div className="flex flex-col gap-6">
        <AlertList alerts={mappedAlerts} loading={isLoadingAlerts} />
        <ClassCapacityList classes={mappedClasses} loading={isLoadingClasses} />
      </div>
    </div>
  )
}
