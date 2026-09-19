import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Toaster } from 'sonner'
import useThemeStore from './stores/themeStore'
import Skeleton from './components/ui/Skeleton'
import useAuth from './hooks/useAuth'
import { setApiNavigator } from './services/api'
import LoginPage from './pages/LoginPage'
import AuthCallback from './pages/AuthCallback'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import ComingSoonPage from './pages/ComingSoonPage'
import CredencialDigitalPage from './pages/socio/CredencialDigitalPage'
import ClasesPage from './pages/socio/ClasesPage'
import ProtectedRoute from './components/routing/ProtectedRoute'
import PublicRoute from './components/routing/PublicRoute'
import CompleteProfileRoute from './components/routing/CompleteProfileRoute'
import AttendancePage from './pages/AttendancePage'
import CreateClassPage from './pages/CreateClassPage'
import ClassSchedulePage from './pages/ClassSchedulePage'

import AforoMonitor from './pages/recepcion/AforoMonitor'
import GestionSocios from './pages/recepcion/GestionSocios'
import Reportes from './pages/recepcion/Reportes'

import AdminPlanesPage from './pages/admin/AdminPlanesPage'
import CheckoutPage from './pages/socio/CheckoutPage'
import CobroManualPage from './pages/recepcion/CobroManualPage'

const AccesoTerminal = lazy(() => import('./pages/recepcion/AccesoTerminal'))

const COMING_SOON_PATHS = ['/socios', '/reportes', '/configuracion']

function RoleBasedClasesRedirect() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.rol === 'socio') return <Navigate to="/socio/clases" replace />
  return <Navigate to="/admin/clases" replace />
}

export default function App() {
  const { theme } = useThemeStore()
  const navigate = useNavigate()

  useEffect(() => {
    setApiNavigator(navigate)
  }, [navigate])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return (
    <>
      <Toaster theme={theme} position="top-right" richColors />
      <Routes>
        {/* Public only — redirect to /dashboard if already logged in */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/completar-perfil" element={<CompleteProfileRoute />} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        
        {/* Redirect for legacy /clases route */}
        <Route path="/clases" element={
          <ProtectedRoute><RoleBasedClasesRedirect /></ProtectedRoute>
        } />

        {/* Admin class management */}
        <Route path="/admin/clases" element={
          <ProtectedRoute roles={['administrador', 'recepcionista']}><ClassSchedulePage /></ProtectedRoute>
        } />
        <Route path="/admin/clases/crear" element={
          <ProtectedRoute roles={['administrador', 'recepcionista']}><CreateClassPage /></ProtectedRoute>
        } />
        <Route path="/admin/clases/asistencia" element={
          <ProtectedRoute roles={['administrador', 'recepcionista']}><AttendancePage /></ProtectedRoute>
        } />

        {/* Legacy redirects */}
        <Route path="/clases/crear" element={<Navigate to="/admin/clases/crear" replace />} />
        <Route path="/clases/asistencia" element={<Navigate to="/admin/clases/asistencia" replace />} />
        <Route path="/membresias" element={<Navigate to="/admin/planes" replace />} />

        {/* Admin planes */}
        <Route path="/admin/planes" element={
          <ProtectedRoute roles={['administrador', 'recepcionista']}><AdminPlanesPage /></ProtectedRoute>
        } />

        {/* Recepcion routes */}
        <Route path="/recepcion/acceso" element={
          <ProtectedRoute roles={['administrador', 'recepcionista']}>
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <AccesoTerminal />
            </Suspense>
          </ProtectedRoute>
        } />
        <Route path="/recepcion/aforo" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><AforoMonitor /></ProtectedRoute>} />
        <Route path="/recepcion/socios" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><GestionSocios /></ProtectedRoute>} />
        <Route path="/recepcion/reportes" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><Reportes /></ProtectedRoute>} />
        <Route path="/recepcion/cobros" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><CobroManualPage /></ProtectedRoute>} />

        {/* Socio routes — mobile first */}
        <Route path="/socio/credencial" element={<ProtectedRoute roles={['administrador', 'socio']}><CredencialDigitalPage /></ProtectedRoute>} />
        <Route path="/socio/clases" element={<ProtectedRoute roles={['administrador', 'socio']}><ClasesPage /></ProtectedRoute>} />
        <Route path="/socio/checkout" element={<ProtectedRoute roles={['socio']}><CheckoutPage /></ProtectedRoute>} />
        <Route path="/socio" element={<ProtectedRoute roles={['administrador', 'socio']}><Navigate to="/socio/credencial" replace /></ProtectedRoute>} />

        {/* Sidebar routes — protected, coming soon */}
        {COMING_SOON_PATHS.map((path) => (
          <Route key={path} path={path} element={<ProtectedRoute><ComingSoonPage /></ProtectedRoute>} />
        ))}

        {/* Root → dashboard if logged in, login if not */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  )
}
