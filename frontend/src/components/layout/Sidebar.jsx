import { useLocation, useNavigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, MonitorPlay, LineChart, Settings, LogOut } from 'lucide-react'
import useAuthStore from '../../stores/authStore'

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: 'chart' },
  { label: 'Socios', path: '/socios', icon: 'people' },
  { label: 'Membresias', path: '/membresias', icon: 'card' },
  { label: 'Clases', path: '/clases', icon: 'monitor' },
  { label: 'Reportes', path: '/reportes', icon: 'chart-line' },
  { label: 'Configuracion', path: '/configuracion', icon: 'gear' },
]

function getIcon(name, isActive) {
  const props = {
    className: `w-5 h-5 transition-colors ${isActive ? 'text-orange-500' : 'text-text-secondary group-hover:text-text-primary'}`,
    strokeWidth: isActive ? 2.5 : 2
  }
  
  switch(name) {
    case 'chart': return <LayoutDashboard {...props} />
    case 'people': return <Users {...props} />
    case 'card': return <CreditCard {...props} />
    case 'monitor': return <MonitorPlay {...props} />
    case 'chart-line': return <LineChart {...props} />
    case 'gear': return <Settings {...props} />
    default: return <LayoutDashboard {...props} />
  }
}

function WinnieLogo({ size = 'md' }) {
  const isSm = size === 'sm'
  return (
    <div className={`flex items-center gap-2 font-black tracking-tighter ${isSm ? 'text-xl' : 'text-2xl'}`}>
      <span className="text-orange-500">Winnie</span>
      <span className="text-text-primary">Gym</span>
    </div>
  )
}

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()

  const displayName = user?.nombre
    ? `${user.nombre} ${user.apellido ?? ''}`.trim()
    : user?.email ?? 'Usuario'
  const rol = user?.rol ?? 'Administrador'

  const currentNavItems = (() => {
    // FORCE SHOW for debugging:
    return NAV_ITEMS.map(item => {
      if (item.label === 'Dashboard') return { ...item, path: '/recepcion/aforo' }
      if (item.label === 'Socios') return { ...item, path: '/recepcion/socios' }
      if (item.label === 'Reportes') return { ...item, path: '/recepcion/reportes' }
      return item
    })
  })()

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
        {currentNavItems.map(({ label, path, icon }) => {
          const isActive = location.pathname === path
          return (
            <NavLink
              key={path}
              to={path}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive 
                  ? 'bg-orange-500/10 text-orange-500' 
                  : 'text-text-secondary hover:bg-bg-raised hover:text-text-primary'
              }`}
            >
              {getIcon(icon, isActive)}
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* User Area */}
      <div className="p-4 border-t border-subtle">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center font-bold text-sm uppercase">
            {displayName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{displayName}</p>
            <p className="text-xs text-text-secondary truncate">{rol}</p>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-text-secondary hover:bg-error-500/10 hover:text-error-500 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  )
}
