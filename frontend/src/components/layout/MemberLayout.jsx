import useThemeStore from '../../stores/themeStore'
import Sidebar from './Sidebar'
import AppBottomNav from './AppBottomNav'

export default function MemberLayout({
  children,
  title,
  subtitle,
  rightAction,
}) {
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-dvh bg-bg-base flex justify-center md:justify-start selection:bg-primary selection:text-white">

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Content Frame */}
      <div className="w-full sm:max-w-sm md:max-w-none md:flex-1 min-h-dvh bg-bg-base text-text-primary flex flex-col relative sm:shadow-2xl sm:border-x sm:border-subtle md:shadow-none md:border-x-0">

        {/* Header Superior */}
        <header className="sticky top-0 z-20 bg-bg-surface backdrop-blur-md px-5 pt-3 pb-3 flex items-center justify-between border-b border-subtle">
          <div className="flex flex-col min-w-0 flex-1">
            <h1 className="text-lg font-bold text-text-primary tracking-tight leading-tight truncate">
              {title || 'Winnie The Gym'}
            </h1>
            {subtitle && (
              <p className="text-xs text-text-tertiary mt-0.5 leading-tight truncate">
                {subtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
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
        <main
          className="flex-1 px-5 py-4 overflow-y-auto"
          style={{ paddingBottom: 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))' }}
        >
          {children}
        </main>

        {/* Bottom Navigation — delegated to AppBottomNav */}
        <AppBottomNav />

      </div>
    </div>
  )
}
