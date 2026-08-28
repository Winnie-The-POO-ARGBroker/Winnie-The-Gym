import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../stores/authStore'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import EmptyState from '../components/ui/EmptyState'
import DevRoleSelector from '../components/dashboard/DevRoleSelector'
import AdminDashboardView from '../components/dashboard/views/AdminDashboardView'
import RecepcionistaDashboardView from '../components/dashboard/views/RecepcionistaDashboardView'
import SocioDashboardView from '../components/dashboard/views/SocioDashboardView'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const IS_DEV = import.meta.env.DEV

  const MOCK_MOVEMENTS = IS_DEV ? [
    { id: 1, name: 'Carlos Pérez', membership: 'Mensual', time: '09:24', type: 'entry' },
    { id: 2, name: 'Laura Gómez', membership: 'Trimestral', time: '09:21', type: 'exit' },
    { id: 3, name: 'Martín Silva', membership: 'Mensual', time: '09:18', type: 'entry' },
    { id: 4, name: 'Valentina Cruz', membership: 'Anual', time: '09:15', type: 'exit' },
    { id: 5, name: 'Diego Ramírez', membership: 'Mensual', time: '09:10', type: 'entry' },
  ] : []

  const MOCK_ALERTS = IS_DEV ? [
    { id: 1, name: 'Ana Torres', tag: 'Morosidad' },
    { id: 2, name: 'Luis Herrera', tag: 'Morosidad' },
    { id: 3, name: 'Sofía Medina', tag: 'Morosidad' },
    { id: 4, name: 'Pablo Ríos', tag: 'Morosidad' },
  ] : []

  const MOCK_CLASSES = IS_DEV ? [
    { id: 1, name: 'Spinning Mañana', current: 20, max: 20 },
    { id: 2, name: 'Yoga Tarde', current: 17, max: 20 },
  ] : []

  const MOCK_SOCIO_DATA = IS_DEV ? {
    plan: 'Pase Libre Full',
    expirationDate: '30 de septiembre, 2026',
    medicalCertificate: 'Al día (Vence Dic 2026)',
    monthlyAttendance: 14,
    upcomingClasses: [
      { id: 1, name: 'Spinning Intensivo', time: 'Hoy · 18:30 hs', instructor: 'Prof. Lucas' },
      { id: 2, name: 'Funcional Training', time: 'Mañana · 10:00 hs', instructor: 'Prof. Camila' },
    ],
  } : {
    plan: '',
    expirationDate: '',
    medicalCertificate: '',
    monthlyAttendance: 0,
    upcomingClasses: [],
  }

  const [devRole, setDevRole] = useState(user?.rol || 'administrador')

  const effectiveRole = IS_DEV ? devRole : user?.rol

  const displayName = user?.nombre
    ? `${user.nombre} ${user.apellido ?? ''}`.trim()
    : user?.email ?? 'Usuario'

  return (
    <AppLayout>
      <TopBar
        title="Dashboard"
        subtitle={`Resumen del día · ${displayName}`}
        showLive
        showSearch={true}
        onScan={() => navigate('/recepcion/acceso')}
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

        {IS_DEV && (
          <DevRoleSelector value={devRole} onChange={setDevRole} />
        )}

        {effectiveRole === 'administrador' && (
          <AdminDashboardView
            navigate={navigate}
            mockMovements={MOCK_MOVEMENTS}
            mockAlerts={MOCK_ALERTS}
            mockClasses={MOCK_CLASSES}
          />
        )}

        {effectiveRole === 'recepcionista' && (
          <RecepcionistaDashboardView
            navigate={navigate}
            mockMovements={MOCK_MOVEMENTS}
          />
        )}

        {effectiveRole === 'socio' && (
          <SocioDashboardView
            navigate={navigate}
            mockSocioData={MOCK_SOCIO_DATA}
          />
        )}

        {!effectiveRole && (
          <EmptyState title="No autorizado" message="Rol no reconocido." />
        )}

      </div>

    </AppLayout>
  )
}
