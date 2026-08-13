import Badge from '../ui/Badge'
import { colors } from '../../styles/tokens'
import Skeleton from '../ui/Skeleton'

function AlertIcon() {
  return (
    <div className="flex items-center justify-center rounded-full flex-shrink-0" style={{ width: 28, height: 28, backgroundColor: colors.error[500] }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </div>
  )
}

export default function AlertList({ alerts = [], loading = false }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1 bg-bg-surface border border-subtle">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-text-primary">Alertas</h2>
        <p className="text-xs text-text-secondary mt-0.5">Requieren atención</p>
      </div>
      {loading
        ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2.5 border-b border-bg-raised">
              <Skeleton className="w-7 h-7 rounded-full" />
              <Skeleton className="flex-1 h-3" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))
        : alerts.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 py-2.5 border-b border-bg-raised"
            >
              <AlertIcon />
              <div className="flex-1 min-w-0">
                {a.name ? (
                  <p className="text-sm font-medium text-text-primary truncate">{a.name}</p>
                ) : (
                  <Skeleton className="w-32 h-3" />
                )}
              </div>
              <Badge variant="danger">{a.tag}</Badge>
            </div>
          ))}
    </div>
  )
}
