import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useThemeStore } from './stores/themeStore'
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

const COMING_SOON_PATHS = ['/socios', '/membresias', '/clases', '/reportes', '/configuracion']

function CompleteProfileRoute() {
  const { accessToken, user } = useAuthStore()
  if (!accessToken || !user) return <Navigate to="/login" replace />
  if (user.is_profile_complete) return <Navigate to="/dashboard" replace />
  return <CompleteProfilePage />
}

export default function App() {
  const { theme } = useThemeStore()

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

        {/* Módulo Socio (Mobile First) */}
        <Route path="/socio/credencial" element={<CredencialDigitalPage />} />
        <Route path="/socio/clases" element={<ClasesPage />} />
        <Route path="/socio" element={<Navigate to="/socio/credencial" replace />} />

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
