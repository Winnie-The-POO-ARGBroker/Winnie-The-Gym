import { NavLink } from 'react-router-dom'
import useThemeStore from '../../stores/themeStore'
import Sidebar from './Sidebar'

export default function MemberLayout({
  children,
  title,
  subtitle,
  rightAction,
}) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen bg-bg-base flex justify-center md:justify-start selection:bg-primary selection:text-white">

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Content Frame */}
      <div className="w-full sm:max-w-sm md:max-w-none md:flex-1 min-h-screen bg-bg-base text-text-primary flex flex-col relative sm:shadow-2xl sm:border-x sm:border-subtle md:shadow-none md:border-x-0">

        {/* Header Superior */}
        <header className="sticky top-0 z-20 bg-bg-surface backdrop-blur-md px-5 pt-3 pb-3 flex items-center justify-between border-b border-subtle">
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-text-primary tracking-tight leading-tight">
              {title || 'Winnie The Gym'}
            </h1>
            {subtitle && (
              <p className="text-xs text-text-tertiary mt-0.5 leading-tight">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {rightAction}
            <button
              onClick={toggleTheme}
              title="Cambiar tema"
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors md:hidden"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                </svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 px-5 py-4 pb-24 md:pb-4 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Navigation — mobile only */}
        <nav
          className="fixed bottom-0 left-1/2 -translate-x-1/2 z-40 w-full sm:max-w-sm h-14 bg-bg-surface border-t border-subtle px-0 pt-1.5 pb-2 shadow-2xl md:hidden"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-5 items-center justify-items-center h-full">

            {/* 1. INICIO */}
            <NavLink
              to="/socio/credencial"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill={isActive ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" fill={isActive ? 'var(--color-bg-surface)' : 'none'} />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">Inicio</span>
                </>
              )}
            </NavLink>

            {/* 2. CLASES */}
            <NavLink
              to="/socio/clases"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors relative ${
                  isActive ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    {isActive && <circle cx="12" cy="15" r="2" fill="currentColor" />}
                  </svg>
                  <span className="text-[10px] font-medium leading-none">Clases</span>
                </>
              )}
            </NavLink>

            {/* 3. QR DINÁMICO */}
            <NavLink
              to="/socio/credencial"
              className="flex flex-col items-center justify-center relative select-none -mt-4"
            >
              {({ isActive }) => (
                <>
                  <div
                    className={`w-11 h-11 rounded-full bg-primary border-4 border-bg-base flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                      isActive ? 'ring-2 ring-primary/40 shadow-primary/30' : ''
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm8-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm10-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4 0h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <span
                    className={`text-[10px] font-medium leading-none mt-1 transition-colors ${
                      isActive ? 'text-primary font-semibold' : 'text-text-tertiary'
                    }`}
                  >
                    QR
                  </span>
                </>
              )}
            </NavLink>

            {/* 4. PAGAR */}
            <NavLink
              to="/socio/checkout"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2}>
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
                    <line x1="1" y1="10" x2="23" y2="10" />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">Pagar</span>
                </>
              )}
            </NavLink>

            {/* 5. PERFIL */}
            <NavLink
              to="/perfil"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-primary font-semibold' : 'text-text-tertiary hover:text-text-secondary'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.5 : 2}>
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span className="text-[10px] font-medium leading-none">Perfil</span>
                </>
              )}
            </NavLink>

          </div>
        </nav>

      </div>
    </div>
  )
}
