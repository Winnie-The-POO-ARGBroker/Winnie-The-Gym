import { useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useThemeStore } from './stores/themeStore'
import { setApiNavigator } from './services/api'
import LoginPage from './pages/LoginPage'
import CompleteProfilePage from './pages/CompleteProfilePage'
import DashboardPage from './pages/DashboardPage'
import ProfilePage from './pages/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import ComingSoonPage from './pages/ComingSoonPage'
import CredencialDigitalPage from './pages/socio/CredencialDigitalPage'
import ClasesPage from './pages/socio/ClasesPage'
import ProtectedRoute from './components/ProtectedRoute'
import PublicRoute from './components/PublicRoute'
import useAuthStore from './stores/authStore'
import AttendanceScreen from './pages/AttendanceScreen'
import CreateClassScreen from './pages/CreateClassScreen'
import ClassesScreen from './pages/ClassesScreen'

import AccesoTerminal from './pages/recepcion/AccesoTerminal'
import AforoMonitor from './pages/recepcion/AforoMonitor'
import GestionSocios from './pages/recepcion/GestionSocios'
import Reportes from './pages/recepcion/Reportes'

import AdminPlanesPage from './pages/admin/AdminPlanesPage'

const COMING_SOON_PATHS = ['/socios', '/reportes', '/configuracion']

function CompleteProfileRoute() {
  const { accessToken, user } = useAuthStore()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  if (user.is_profile_complete) return <Navigate to="/dashboard" replace />
  return <CompleteProfilePage />
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
        <Route path="/completar-perfil" element={<CompleteProfileRoute />} />

        {/* Protected */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/perfil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        
        {/* Clases routes */}
        <Route path="/clases" element={<ProtectedRoute><ClassesScreen /></ProtectedRoute>} />
        <Route path="/admin/clases" element={<ProtectedRoute><ClassesScreen /></ProtectedRoute>} />
        <Route path="/clases/crear" element={<ProtectedRoute><CreateClassScreen /></ProtectedRoute>} />
        <Route path="/admin/clases/crear" element={<ProtectedRoute><CreateClassScreen /></ProtectedRoute>} />
        <Route path="/clases/asistencia" element={<ProtectedRoute><AttendanceScreen /></ProtectedRoute>} />
        <Route path="/admin/clases/asistencia" element={<ProtectedRoute><AttendanceScreen /></ProtectedRoute>} />

        {/* Planes / Membresías routes */}
        <Route path="/membresias" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><AdminPlanesPage /></ProtectedRoute>} />
        <Route path="/admin/planes" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><AdminPlanesPage /></ProtectedRoute>} />

        {/* Recepcion routes */}
        <Route path="/recepcion/acceso" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><AccesoTerminal /></ProtectedRoute>} />
        <Route path="/recepcion/aforo" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><AforoMonitor /></ProtectedRoute>} />
        <Route path="/recepcion/socios" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><GestionSocios /></ProtectedRoute>} />
        <Route path="/recepcion/reportes" element={<ProtectedRoute roles={['administrador', 'recepcionista']}><Reportes /></ProtectedRoute>} />

        {/* Socio routes — mobile first */}
        <Route path="/socio/credencial" element={<ProtectedRoute roles={['administrador', 'socio']}><CredencialDigitalPage /></ProtectedRoute>} />
        <Route path="/socio/clases" element={<ProtectedRoute roles={['administrador', 'socio']}><ClasesPage /></ProtectedRoute>} />
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
