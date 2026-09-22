import { useNavigate } from 'react-router-dom'
import useAuth from '../hooks/useAuth'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import EmptyState from '../components/ui/EmptyState'
import AdminDashboardView from '../components/dashboard/views/AdminDashboardView'
import RecepcionistaDashboardView from '../components/dashboard/views/RecepcionistaDashboardView'
import SocioDashboardView from '../components/dashboard/views/SocioDashboardView'

export default function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const effectiveRole = user?.rol || 'administrador'

  const displayName = user?.nombre
    ? `${user.nombre} ${user.apellido ?? ''}`.trim()
    : user?.email ?? 'Usuario'

  return (
    <AppLayout>
      <TopBar
        title="Dashboard"
        subtitle={`Resumen del día · ${displayName}`}
        showLive
        showSearch={effectiveRole !== 'socio'}
        onScan={effectiveRole !== 'socio' ? () => navigate('/recepcion/acceso') : undefined}
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

        {effectiveRole === 'administrador' && (
          <AdminDashboardView />
        )}

        {effectiveRole === 'recepcionista' && (
          <RecepcionistaDashboardView
            navigate={navigate}
          />
        )}

        {effectiveRole === 'socio' && (
          <SocioDashboardView
            navigate={navigate}
          />
        )}

        {!effectiveRole && (
          <EmptyState title="No autorizado" message="Rol no reconocido." />
        )}

      </div>

    </AppLayout>
  )
}

