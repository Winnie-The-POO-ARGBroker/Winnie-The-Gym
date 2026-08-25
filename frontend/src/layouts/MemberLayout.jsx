import { NavLink } from 'react-router-dom'
import { useThemeStore } from '../stores/themeStore'
import useAuthStore from '../stores/authStore'
import { MOCK_MEMBER } from '../services/socioMockData'

export default function MemberLayout({
  children,
  member = MOCK_MEMBER,
  title,
  subtitle,
  rightAction,
}) {
  const { theme, toggleTheme } = useThemeStore()
  const { user } = useAuthStore()

  return (
    <div className="min-h-screen bg-neutral-950 flex justify-center selection:bg-orange-500 selection:text-white">
      {/* Mobile-First Frame Container */}
      <div className="w-full max-w-sm min-h-screen bg-bg-base text-text-primary flex flex-col relative shadow-2xl border-x border-subtle">
        
        {/* Header Superior */}
        <header className="sticky top-0 z-20 bg-bg-base/95 backdrop-blur-md px-5 pt-3 pb-3 flex items-center justify-between border-b border-subtle">
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
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              title="Cambiar tema"
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
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

        {/* Main Content Area */}
        <main className="flex-1 px-5 py-4 pb-24 overflow-y-auto">
          {children}
        </main>

        {/* Bottom Navigation Bar (Inicio/Clases/QR/Rutina/Perfil) */}
        <nav
          className="fixed bottom-0 z-40 w-full max-w-sm h-14 bg-bg-surface border-t border-subtle px-0 pt-1.5 pb-2 shadow-2xl"
          style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
        >
          <div className="grid grid-cols-5 items-center justify-items-center h-full">
            
            {/* 1. INICIO */}
            <NavLink
              to="/socio/credencial"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-orange-500 font-semibold' : 'text-text-tertiary hover:text-text-secondary'
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
                  isActive ? 'text-orange-500 font-semibold' : 'text-text-tertiary hover:text-text-secondary'
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
                    className={`w-11 h-11 rounded-full bg-orange-500 border-4 border-bg-base flex items-center justify-center shadow-lg transition-transform active:scale-95 ${
                      isActive ? 'ring-2 ring-orange-500/40 shadow-orange-500/30' : ''
                    }`}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                      <path d="M4 4h6v6H4V4zm2 2v2h2V6H6zm8-2h6v6h-6V4zm2 2v2h2V6h-2zM4 14h6v6H4v-6zm2 2v2h2v-2H6zm10-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4 0h2v2h-2v-2z" />
                    </svg>
                  </div>
                  <span
                    className={`text-[10px] font-medium leading-none mt-1 transition-colors ${
                      isActive ? 'text-orange-500 font-semibold' : 'text-text-tertiary'
                    }`}
                  >
                    QR
                  </span>
                </>
              )}
            </NavLink>

            {/* 4. RUTINA */}
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12" strokeLinecap="round" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Rutina</span>
            </button>

            {/* 5. PERFIL */}
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-0.5 text-text-tertiary hover:text-text-secondary transition-colors"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="text-[10px] font-medium leading-none">Perfil</span>
            </button>

          </div>
        </nav>

      </div>
    </div>
  )
}
