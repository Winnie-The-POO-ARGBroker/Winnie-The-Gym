import Badge from '../ui/Badge'

export default function TopBar({ title, subtitle, showLive = false, onScan }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-strong flex-shrink-0 bg-bg-surface">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">{title}</h1>
          {showLive && <Badge variant="live">En Vivo</Badge>}
        </div>
        {subtitle && (
          <p className="text-sm mt-0.5 text-text-secondary">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bg-raised border border-strong">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-neutral-400"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            aria-label="Buscar socio"
            placeholder="Buscar socio"
            className="bg-transparent text-sm text-text-primary outline-none w-48 appearance-none placeholder:text-text-tertiary"
          />
        </div>
        {onScan && (
          <button
            onClick={onScan}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 bg-orange-500"
          >
            Escanear QR
          </button>
        )}
      </div>
    </header>
  )
}
