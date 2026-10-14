import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { MoreHorizontal, LogOut, Sun, Moon, User } from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import useThemeStore from '../../stores/themeStore'
import { NAV_CONFIG } from '../../config/navConfig'
import { NAV_ICON_MAP } from '../../constants/navIcons'

// ── Sheet component ───────────────────────────────────────────────────────────

function MasSheet({ items, onClose }) {
  const navigate = useNavigate()
  const { clearAuth } = useAuth()
  const { theme, toggleTheme } = useThemeStore()

  const handleNav = (path) => {
    onClose()
    navigate(path)
  }

  const handleLogout = () => {
    onClose()
    clearAuth()
    navigate('/login')
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-subtle rounded-t-2xl px-4 pt-4 shadow-2xl md:hidden"
        style={{ paddingBottom: 'max(2rem, calc(env(safe-area-inset-bottom) + 1rem))' }}
        role="dialog"
        aria-label="Más opciones"
      >
        {/* Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-border-subtle rounded-full" />
        </div>

        <div className="flex flex-col gap-1">
          {items.map(({ label, path, icon }) => {
            const Icon = NAV_ICON_MAP[icon] ?? NAV_ICON_MAP.chart
            return (
              <button
                key={path}
                onClick={() => handleNav(path)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-text-primary hover:bg-bg-raised transition-colors text-sm font-medium w-full text-left"
              >
                <Icon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                {label}
              </button>
            )
          })}

          {/* Mi perfil */}
          <button
            onClick={() => handleNav('/perfil')}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-text-primary hover:bg-bg-raised transition-colors text-sm font-medium w-full text-left"
          >
            <User className="w-5 h-5 text-text-secondary flex-shrink-0" />
            Mi perfil
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => { toggleTheme(); onClose() }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-text-primary hover:bg-bg-raised transition-colors text-sm font-medium w-full text-left"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-text-secondary flex-shrink-0" />
            ) : (
              <Moon className="w-5 h-5 text-text-secondary flex-shrink-0" />
            )}
            Tema
          </button>

          {/* Divider */}
          <div className="h-px bg-border-subtle my-1" />

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-error-500 hover:bg-error-500/10 transition-colors text-sm font-medium w-full text-left"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AppBottomNav() {
  const { user } = useAuth()
  const [masOpen, setMasOpen] = useState(false)

  const rol = user?.rol
  const roleConfig = NAV_CONFIG[rol]

  if (!roleConfig) return null

  const primaryItems = roleConfig.primary
  const moreItems = roleConfig.more

  // For recepcionista: primary already has 4 items, "Más" is the 5th → exactly 5 columns
  // For admin/socio: primary has 4 items + "Más" → 5 columns
  const navItems = [...primaryItems, { key: 'mas', label: 'Más', Icon: MoreHorizontal }]

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-surface border-t border-subtle"
        style={{
          minHeight: '3.5rem',
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
        }}
        aria-label="Navegación principal"
      >
        <div
          className="grid items-center justify-items-center h-14"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
        >
          {navItems.map((item) => {
            // "Pagar" is only visible for socio role
            if (item.soloSocio && rol !== 'socio') return null

            // "Más" button
            if (item.key === 'mas') {
              return (
                <button
                  key="mas"
                  onClick={() => setMasOpen(true)}
                  className={`flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] transition-colors ${
                    masOpen ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                  aria-label="Más opciones"
                  aria-expanded={masOpen}
                >
                  <MoreHorizontal className="w-5 h-5" strokeWidth={masOpen ? 2.5 : 2} />
                  <span className="text-[10px] font-medium leading-none">Más</span>
                </button>
              )
            }

            const Icon = NAV_ICON_MAP[item.icon] ?? NAV_ICON_MAP.chart

            // Regular nav link
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 w-full h-full min-h-[44px] transition-colors ${
                    isActive ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium leading-none">{item.label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {masOpen && (
        <MasSheet
          items={moreItems}
          onClose={() => setMasOpen(false)}
        />
      )}
    </>
  )
}
