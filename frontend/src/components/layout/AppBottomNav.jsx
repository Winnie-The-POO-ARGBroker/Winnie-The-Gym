import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, CalendarDays, CreditCard, MoreHorizontal, Home, QrCode, Wallet, FileText, User, Settings, LogOut, Sun, Moon } from 'lucide-react'
import useAuth from '../../hooks/useAuth'
import useThemeStore from '../../stores/themeStore'

// ── Socio nav items (bottom bar) ──────────────────────────────────────────────
const SOCIO_NAV = [
  { label: 'Inicio',     path: '/dashboard',       Icon: Home },
  { label: 'Credencial', path: '/socio/credencial', Icon: QrCode },
  { label: 'Clases',     path: '/socio/clases',     Icon: CalendarDays },
  { label: 'Pagar',      path: '/socio/checkout',   Icon: CreditCard, soloSocio: true },
  { label: 'Más',        key: 'mas',                Icon: MoreHorizontal },
]

// Socio "Más" sheet items
const SOCIO_MAS = [
  { label: 'Mis Pagos', path: '/socio/pagos',  Icon: Wallet },
  { label: 'Perfil',    path: '/perfil',        Icon: User },
]

// ── Admin/Recep nav items (bottom bar) ────────────────────────────────────────
const ADMIN_NAV = [
  { label: 'Dashboard', path: '/dashboard',        Icon: LayoutDashboard },
  { label: 'Socios',    path: '/recepcion/socios', Icon: Users },
  { label: 'Clases',    path: '/admin/clases',     Icon: CalendarDays },
  { label: 'Más',       key: 'mas',                Icon: MoreHorizontal },
]

// Admin/Recep "Más" sheet items
const ADMIN_MAS = [
  { label: 'Usuarios', path: '/admin/usuarios',      Icon: Users },
  { label: 'Planes',   path: '/admin/planes',         Icon: FileText },
  { label: 'Config',   path: '/configuracion',        Icon: Settings },
  { label: 'Perfil',   path: '/perfil',               Icon: User },
]

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
        className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-subtle rounded-t-2xl px-4 pb-8 pt-4 shadow-2xl md:hidden"
        role="dialog"
        aria-label="Más opciones"
      >
        {/* Handle */}
        <div className="flex justify-center mb-3">
          <div className="w-10 h-1 bg-border-subtle rounded-full" />
        </div>

        <div className="flex flex-col gap-1">
          {items.map(({ label, path, Icon }) => (
            <button
              key={path}
              onClick={() => handleNav(path)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-text-primary hover:bg-bg-raised transition-colors text-sm font-medium w-full text-left"
            >
              <Icon className="w-5 h-5 text-text-secondary flex-shrink-0" />
              {label}
            </button>
          ))}

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
            Tema (alto contraste)
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

  let navItems
  let masItems

  if (rol === 'socio') {
    // Filter out "Pagar" for non-socio (guard: socio always sees it, but we keep soloSocio flag)
    navItems = SOCIO_NAV
    masItems = SOCIO_MAS
  } else if (rol === 'administrador' || rol === 'recepcionista') {
    navItems = ADMIN_NAV
    // Hide "Pagar" (soloSocio items) — not in admin nav but check /socio/credencial path
    masItems = ADMIN_MAS
  } else {
    return null
  }

  // On /socio/credencial, admin/recep should NOT see "Pagar" in socio nav
  // (admin doesn't have SOCIO_NAV at all, so this only matters if we ever render it for them)

  const isMasActive = masOpen

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-bg-surface border-t border-subtle"
        style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
        aria-label="Navegación principal"
      >
        <div
          className="grid items-center justify-items-center h-full"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, 1fr)` }}
        >
          {navItems.map(({ label, path, key, Icon, soloSocio }) => {
            // "Pagar" is only visible for socio role
            if (soloSocio && rol !== 'socio') return null

            // "Más" button
            if (key === 'mas') {
              return (
                <button
                  key="mas"
                  onClick={() => setMasOpen(true)}
                  className={`flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isMasActive ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                  }`}
                  aria-label="Más opciones"
                  aria-expanded={masOpen}
                >
                  <Icon className="w-5 h-5" strokeWidth={isMasActive ? 2.5 : 2} />
                  <span className="text-[10px] font-medium leading-none">{label}</span>
                </button>
              )
            }

            // Regular nav link
            return (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    isActive ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                    <span className="text-[10px] font-medium leading-none">{label}</span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {masOpen && (
        <MasSheet
          items={masItems}
          onClose={() => setMasOpen(false)}
        />
      )}
    </>
  )
}
