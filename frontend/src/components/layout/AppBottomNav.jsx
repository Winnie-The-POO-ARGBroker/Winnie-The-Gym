import { NavLink } from 'react-router-dom'
import { NAV_ICON_MAP } from '../../constants/navIcons'
import useAuthStore from '../../stores/authStore'

const MOBILE_NAV = {
  administrador: [
    { label: 'Dashboard', path: '/dashboard',          icon: 'chart' },
    { label: 'Acceso',    path: '/recepcion/acceso',   icon: 'scan' },
    { label: 'Socios',    path: '/recepcion/socios',   icon: 'people' },
    { label: 'Reportes',  path: '/recepcion/reportes', icon: 'chart-line' },
    { label: 'Config',    path: '/configuracion',      icon: 'gear' },
  ],
  recepcionista: [
    { label: 'Dashboard', path: '/dashboard',          icon: 'chart' },
    { label: 'Acceso',    path: '/recepcion/acceso',   icon: 'scan' },
    { label: 'Aforo',     path: '/recepcion/aforo',    icon: 'activity' },
    { label: 'Socios',    path: '/recepcion/socios',   icon: 'people' },
    { label: 'Reportes',  path: '/recepcion/reportes', icon: 'chart-line' },
  ],
}

export default function AppBottomNav() {
  const { user } = useAuthStore()
  const rol = user?.rol

  const items = MOBILE_NAV[rol]
  if (!items) return null

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-bg-surface border-t border-subtle"
      style={{ paddingBottom: 'max(0rem, env(safe-area-inset-bottom))' }}
    >
      <div className="grid grid-cols-5 items-center justify-items-center h-full">
        {items.map(({ label, path, icon }) => {
          const Icon = NAV_ICON_MAP[icon] ?? NAV_ICON_MAP.chart

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
  )
}
