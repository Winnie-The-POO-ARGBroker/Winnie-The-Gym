import Avatar from '../ui/Avatar'
import { colors, withAlpha } from '../../styles/tokens'
import Skeleton from '../ui/Skeleton'

function EntryIcon() {
  return (
    <div
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
              {m.type === 'entry' ? <EntryIcon /> : <ExitIcon />}
              <Avatar name={m.name} size={36} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{m.name}</p>
                <p className="text-xs truncate text-text-secondary">{m.membership}</p>
              </div>
              <span className="text-xs font-medium flex-shrink-0 text-text-secondary">{m.time}</span>
            </div>
          ))}
    </div>
  )
}
