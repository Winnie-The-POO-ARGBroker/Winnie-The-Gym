import { ArrowLeft } from 'lucide-react'
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
      className="p-2 rounded-xl bg-bg-surface border border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
    >
      <ArrowLeft className="w-5 h-5" />
    </button>
  )
}

export default function TopBar({ title, subtitle, showLive = false, showSearch = false, onScan, rightContent, backAction }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-strong flex-shrink-0 bg-bg-surface">
      <div className="flex items-center gap-3">
        {backAction && <BackButton {...backAction} />}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
            {showLive && <Badge variant="live">En Vivo</Badge>}
          </div>
          {subtitle && (
            <p className="text-sm mt-0.5 text-text-secondary">{subtitle}</p>
          )}
        </div>
      </div>

      {rightContent ? (
        <div className="flex items-center gap-3">
          {rightContent}
        </div>
      ) : showSearch ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-raised border border-strong">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-text-tertiary"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="search"
              aria-label="Buscar socio"
              placeholder="Buscar socio"
              className="bg-transparent text-sm text-text-primary outline-none w-32 lg:w-48 appearance-none placeholder:text-text-tertiary"
            />
          </div>
          {onScan && (
            <button
              onClick={onScan}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-primary"
            >
              Escanear QR
            </button>
          )}
        </div>
      ) : null}
    </header>
  )
}
