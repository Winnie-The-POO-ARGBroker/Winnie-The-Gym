import { useState } from 'react'
import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { NAV_ICON_MAP } from '../../constants/navIcons'
import useAuthStore from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import WinnieLogo from '../ui/WinnieLogo'
import Avatar from '../ui/Avatar'

// Each entry is either a nav item { label, path, icon }
// or a section divider { divider: true, label }
const NAV_BY_ROLE = {
  administrador: [
    { label: 'Dashboard',         path: '/dashboard',          icon: 'chart' },
    { divider: true, label: 'Recepción' },
    { label: 'Acceso',            path: '/recepcion/acceso',   icon: 'scan' },
    { label: 'Aforo',             path: '/recepcion/aforo',    icon: 'activity' },
    { label: 'Gestión Socios',    path: '/recepcion/socios',   icon: 'people' },
    { label: 'Reportes',          path: '/recepcion/reportes', icon: 'chart-line' },
    { divider: true, label: 'Socio' },
    { label: 'Credencial',        path: '/socio/credencial',   icon: 'card' },
    { label: 'Clases',            path: '/socio/clases',       icon: 'monitor' },
    { divider: true, label: 'General' },
    { label: 'Membresias',        path: '/membresias',         icon: 'card' },
    { label: 'Configuracion',     path: '/configuracion',      icon: 'gear' },
  ],
  recepcionista: [
    { label: 'Dashboard',         path: '/dashboard',          icon: 'chart' },
    { label: 'Acceso',            path: '/recepcion/acceso',   icon: 'scan' },
    { label: 'Aforo',             path: '/recepcion/aforo',    icon: 'activity' },
    { label: 'Socios',            path: '/recepcion/socios',   icon: 'people' },
    { label: 'Reportes',          path: '/recepcion/reportes', icon: 'chart-line' },
  ],
  socio: [
    { label: 'Mi Credencial',     path: '/socio/credencial',   icon: 'card' },
    { label: 'Clases',            path: '/socio/clases',       icon: 'monitor' },
  ],
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  
  const displayName = user?.nombre
    ? `${user.nombre} ${user.apellido ?? ''}`.trim()
    : user?.email ?? 'Usuario'
  const rol = user?.rol ?? 'administrador'

  const currentNavItems = NAV_BY_ROLE[rol] ?? NAV_BY_ROLE.administrador

  if (!user) return null

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="hidden md:flex flex-col h-full w-60 flex-shrink-0 bg-bg-surface border-r border-subtle">
      {/* Logo */}
      <div className="px-5 py-6">
        <WinnieLogo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3 overflow-y-auto">
        {currentNavItems.map((item, idx) => {
          if (item.divider) {
            return (
              <div key={`divider-${idx}`} className="px-3 pt-4 pb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-tertiary">
                  {item.label}
                </span>
              </div>
            )
          }

          const { label, path, icon } = item
          const isActive = location.pathname === path

          const iconProps = {
            className: `w-5 h-5 flex-shrink-0 transition-colors ${isActive ? 'text-white' : 'text-text-secondary group-hover:text-text-primary'}`,
            strokeWidth: isActive ? 2.5 : 2,
          }

          const Icon = NAV_ICON_MAP[icon] ?? NAV_ICON_MAP.chart

          return (
            <NavLink
              key={path}
              to={path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
              }`}
            >
              <Icon {...iconProps} />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Theme toggle */}
      <div className="flex justify-end px-4 pb-2">
        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-lg transition-colors hover:bg-bg-raised text-text-tertiary hover:text-text-secondary"
        >
          {theme === 'dark' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>

      {/* User footer */}
      <div className="relative mx-3 mb-4">
        {/* Profile popup menu */}
        {menuOpen && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />

            {/* Card */}
            <div className="absolute bottom-full mb-2 left-0 right-0 z-20 rounded-xl overflow-hidden shadow-xl bg-bg-surface border border-subtle">
              {/* User info header */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-subtle">
                <Avatar name={displayName} size={40} />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-text-primary truncate">{displayName}</span>
                  <span className="text-xs capitalize truncate text-text-secondary">{rol}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col py-1">
                <button
                  onClick={() => { setMenuOpen(false); navigate('/perfil') }}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-left text-text-primary transition-colors hover:bg-bg-raised"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-text-tertiary">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                  Ver perfil
                </button>

                <div className="h-px bg-bg-raised mx-4 my-1" />

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-bg-raised text-error-500"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </div>
          </>
        )}

        {/* Trigger button */}
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-bg-raised bg-bg-raised"
        >
          <Avatar name={displayName} size={36} />
          <div className="flex flex-col min-w-0 flex-1 text-left">
            <span className="text-sm font-medium text-text-primary truncate">{displayName}</span>
            <span className="text-xs capitalize truncate text-text-secondary">{rol}</span>
          </div>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            className="text-text-tertiary"
            style={{ transform: menuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
