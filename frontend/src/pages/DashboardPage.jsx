import useAuthStore from '../stores/authStore'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import AforoCard from '../components/dashboard/AforoCard'
import MovementList from '../components/dashboard/MovementList'
import AlertList from '../components/dashboard/AlertList'
import ClassCapacityList from '../components/dashboard/ClassCapacityList'

const MOCK_MOVEMENTS = [
  { id: 1, name: 'Carlos Pérez', membership: 'Mensual', time: '09:24', type: 'entry' },
  { id: 2, name: 'Laura Gómez', membership: 'Trimestral', time: '09:21', type: 'exit' },
  { id: 3, name: 'Martín Silva', membership: 'Mensual', time: '09:18', type: 'entry' },
  { id: 4, name: 'Valentina Cruz', membership: 'Anual', time: '09:15', type: 'exit' },
  { id: 5, name: 'Diego Ramírez', membership: 'Mensual', time: '09:10', type: 'entry' },
]

const MOCK_ALERTS = [
  { id: 1, name: 'Ana Torres', tag: 'Morosidad' },
  { id: 2, name: 'Luis Herrera', tag: 'Morosidad' },
  { id: 3, name: 'Sofía Medina', tag: 'Morosidad' },
  { id: 4, name: 'Pablo Ríos', tag: 'Morosidad' },
]

const MOCK_CLASSES = [
  { id: 1, name: 'Spinning Mañana', current: 20, max: 20 },
  { id: 2, name: 'Yoga Tarde', current: 17, max: 20 },
]

export default function DashboardPage() {
  const { user } = useAuthStore()

  const displayName = user?.nombre
    ? `${user.nombre} ${user.apellido ?? ''}`.trim()
    : user?.email ?? 'Usuario'

  return (
    <AppLayout>
      <TopBar
        title="Dashboard"
        subtitle={`Resumen del día · ${displayName}`}
        showLive
        onScan={() => {}}
      />

      <div className="flex-1 p-4 overflow-auto">
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr minmax(0, 360px)' }}>
          {/* Left column */}
          <div className="flex flex-col gap-4">
            <AforoCard current={150} max={200} entries={232} exits={76} />
            <MovementList movements={MOCK_MOVEMENTS} />
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            <AlertList alerts={MOCK_ALERTS} />
            <ClassCapacityList classes={MOCK_CLASSES} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
