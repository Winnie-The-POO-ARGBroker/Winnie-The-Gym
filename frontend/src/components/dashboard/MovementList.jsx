import Avatar from '../ui/Avatar'
import { colors, withAlpha } from '../../styles/tokens'
import Skeleton from '../ui/Skeleton'

function EntryIcon() {
  return (
    <div
      data-testid="movement-entry"
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: 32, height: 32, backgroundColor: withAlpha(colors.success[500], 0.18) }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.success[500]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="7" y1="17" x2="17" y2="7" />
        <polyline points="7 7 17 7 17 17" />
      </svg>
    </div>
  )
}

function ExitIcon() {
  return (
    <div
      data-testid="movement-exit"
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: 32, height: 32, backgroundColor: withAlpha(colors.error[500], 0.18) }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.error[500]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="17" y1="7" x2="7" y2="17" />
        <polyline points="17 17 7 17 7 7" />
      </svg>
    </div>
  )
}

function UnknownIcon() {
  return (
    <div
      data-testid="movement-unknown"
      className="flex items-center justify-center rounded-full flex-shrink-0 bg-bg-raised"
      style={{ width: 32, height: 32 }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-text-secondary">
        <line x1="6" y1="12" x2="18" y2="12" />
      </svg>
    </div>
  )
}

function DeniedIcon() {
  return (
    <div
      data-testid="movement-denied"
      className="flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: 32, height: 32, backgroundColor: withAlpha(colors.warning[500], 0.18) }}
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={colors.warning[500]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" />
        <line x1="5.6" y1="5.6" x2="18.4" y2="18.4" />
      </svg>
    </div>
  )
}

function movementIcon(m) {
  if (m.denied) return <DeniedIcon />
  if (m.type === 'entry') return <EntryIcon />
  if (m.type === 'exit') return <ExitIcon />
  return <UnknownIcon />
}

function deniedLabel(type) {
  if (type === 'entry') return 'Entrada denegada'
  if (type === 'exit') return 'Salida denegada'
  return 'Acceso denegado'
}

export default function MovementList({ movements = [], loading = false }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1 bg-bg-surface border border-subtle">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-text-primary">Movimientos recientes</h2>
        <p className="text-xs text-text-secondary mt-0.5">Entradas y salidas</p>
      </div>
      {loading
        ? Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-bg-raised">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="w-8 h-8 rounded-full" />
              <div className="flex-1 flex flex-col gap-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-2.5 w-24" />
              </div>
              <Skeleton className="h-2.5 w-10" />
            </div>
          ))
        : movements.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-3 py-2.5 border-b border-bg-raised"
            >
              {movementIcon(m)}
              <Avatar name={m.name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{m.name}</p>
                <p className="text-xs truncate text-text-secondary">{m.membership}</p>
                {m.denied && (
                  <p className="text-xs truncate text-warning-500">
                    {deniedLabel(m.type)}
                    {m.denialReason ? ` — ${m.denialReason}` : ''}
                  </p>
                )}
              </div>
              <span className="text-xs font-medium flex-shrink-0 text-text-secondary">{m.time}</span>
            </div>
          ))}
    </div>
  )
}
