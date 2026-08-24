import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import useAuthStore from '../../stores/authStore'
import { useThemeStore } from '../../stores/themeStore'
import WinnieLogo from '../ui/WinnieLogo'
import Avatar from '../ui/Avatar'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'chart' },
  { label: 'Socios', path: '/socios', icon: 'people' },
  { label: 'Membresias', path: '/membresias', icon: 'card' },
  { label: 'Clases', path: '/clases', icon: 'monitor' },
  { label: 'Reportes', path: '/reportes', icon: 'chart-line' },
  { label: 'Configuracion', path: '/configuracion', icon: 'gear' },
]

const icons = {
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  people: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6H3z" />
      <circle cx="17" cy="7" r="2.5" />
      <path d="M21 20c0-2.8-1.8-5.1-4.3-5.8.9.9 1.3 2.1 1.3 3.8H21z" />
    </svg>
  ),
  card: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <rect x="2" y="9" width="20" height="3" fill="var(--color-bg-surface)" />
      <rect x="4" y="14" width="5" height="2" rx="0.5" fill="var(--color-bg-surface)" opacity="0.6" />
    </svg>
  ),
  monitor: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  ),
  'chart-line': (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 17 8 12 13 15 21 7" />
      <line x1="3" y1="21" x2="21" y2="21" />
    </svg>
  ),
  gear: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  ),
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
  const rol = user?.rol ?? 'Administrador'

  function handleLogout() {
    clearAuth()
    navigate('/login', { replace: true })
  }

  return (
    <aside className="flex flex-col h-full flex-shrink-0 bg-bg-surface border-r border-subtle" style={{ width: 240 }}>
      {/* Logo */}
      <div className="px-5 py-6">
        <WinnieLogo size="sm" />
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 px-3">
        {NAV_ITEMS.map(({ label, path, icon }) => {
          const isActive = location.pathname === path
          return (
            <NavLink
              key={path}
              to={path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors"
              style={{
                backgroundColor: isActive ? '#FF5722' : 'transparent',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'var(--color-bg-raised)'
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
            >
              <span style={{ color: isActive ? 'white' : 'var(--color-text-secondary)' }}>
                {icons[icon]}
              </span>
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
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
