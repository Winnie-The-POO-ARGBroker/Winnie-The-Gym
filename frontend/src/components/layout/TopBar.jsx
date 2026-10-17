import { useState } from 'react'
import { ArrowLeft, Search, X, MoreVertical } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '../ui/Badge'

function BackButton({ to, onClick, label = 'Volver' }) {
  const navigate = useNavigate()
  const handleClick = onClick ?? (() => (to ? navigate(to) : navigate(-1)))
  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      className="p-2 rounded-xl bg-bg-surface border border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors flex-shrink-0"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}

/**
 * TopBar — responsive page header.
 *
 * Props:
 *   title        {string}           - Page title (truncated on mobile)
 *   subtitle     {string}           - Optional subtitle
 *   showLive     {boolean}          - Show "En Vivo" badge
 *   showSearch   {boolean}          - Show collapsible search input
 *   onScan       {function}         - Callback for QR scan button
 *   rightContent {ReactNode}        - Legacy slot: arbitrary content on the right
 *   actions      {Array<{label, icon: ReactNode, onClick}>}
 *                                   - Action buttons. On mobile they collapse into
 *                                     a "⋮" menu; on desktop they render inline.
 *   toolbar      {ReactNode}        - Slot rendered below the title row (toggles, tabs, etc.)
 *   backAction   {Object}           - Props forwarded to BackButton
 */
export default function TopBar({
  title,
  subtitle,
  showLive = false,
  showSearch = false,
  onScan,
  rightContent,
  actions,
  toolbar,
  backAction,
}) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/recepcion/socios?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
      setSearchOpen(false)
    }
  }

  const hasActions = Array.isArray(actions) && actions.length > 0

  return (
    <header className="flex flex-col flex-shrink-0 bg-bg-surface border-b border-strong">
      {/* Main row */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 gap-3 min-w-0">
        {/* Left: back + title */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {backAction && <BackButton {...backAction} />}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3 min-w-0">
              <h1 className="text-xl md:text-2xl font-bold text-text-primary truncate">
                {title}
              </h1>
              {showLive && <Badge variant="live">En Vivo</Badge>}
            </div>
            {subtitle && (
              <p className="text-sm mt-0.5 text-text-secondary truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Collapsible search toggle (mobile) */}
          {showSearch && (
            <>
              {/* Mobile: icon toggle */}
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar'}
                className="md:hidden p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
              >
                {searchOpen ? <X className="w-5 h-5" /> : <Search className="w-5 h-5" />}
              </button>

              {/* Desktop: inline search form */}
              <form
                onSubmit={handleSearch}
                className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-raised border border-strong"
              >
                <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
                <input
                  type="search"
                  aria-label="Buscar socio"
                  placeholder="Buscar socio"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base w-32 lg:w-48 appearance-none placeholder:text-text-tertiary"
                />
              </form>

              {onScan && (
                <button
                  onClick={onScan}
                  className="hidden md:block px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-primary"
                >
                  Escanear QR
                </button>
              )}
            </>
          )}

          {/* Legacy rightContent slot */}
          {rightContent && !hasActions && (
            <div className="flex items-center gap-2">{rightContent}</div>
          )}

          {/* Actions prop — desktop: render inline; mobile: collapse into ⋮ menu */}
          {hasActions && (
            <>
              {/* Desktop: all actions inline */}
              <div className="hidden md:flex items-center gap-2">
                {actions.map((action, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={action.onClick}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-orange-700 text-white hover:opacity-90 transition-opacity"
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>

              {/* Mobile: overflow menu */}
              <div className="relative md:hidden">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  aria-label="Acciones"
                  aria-expanded={mobileMenuOpen}
                  className="p-2 rounded-xl text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {mobileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMobileMenuOpen(false)}
                      aria-hidden="true"
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-xl bg-bg-surface border border-subtle shadow-xl overflow-hidden">
                      {actions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => { action.onClick?.(); setMobileMenuOpen(false) }}
                          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-text-primary hover:bg-bg-raised transition-colors text-left"
                        >
                          {action.icon}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Collapsible search row — mobile only */}
      {showSearch && searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-raised border border-strong"
          >
            <Search className="w-4 h-4 text-text-tertiary flex-shrink-0" />
            <input
              type="search"
              aria-label="Buscar socio"
              placeholder="Buscar socio"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="bg-transparent text-base md:text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base flex-1 appearance-none placeholder:text-text-tertiary"
            />
            {onScan && (
              <button
                type="button"
                onClick={() => { onScan(); setSearchOpen(false) }}
                className="text-xs font-semibold text-primary"
              >
                QR
              </button>
            )}
          </form>
        </div>
      )}

      {/* Toolbar slot — rendered below the title row */}
      {toolbar && (
        <div className="px-4 md:px-6 pb-3">
          {toolbar}
        </div>
      )}
    </header>
  )
}
