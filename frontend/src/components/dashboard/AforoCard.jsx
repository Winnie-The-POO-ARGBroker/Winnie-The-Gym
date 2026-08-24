import CircularProgress from '../ui/CircularProgress'
import Skeleton from '../ui/Skeleton'

export default function AforoCard({ current, max, entries, exits, loading = false }) {
  if (loading) {
    return (
      <div className="rounded-2xl p-6 flex items-center gap-8 bg-bg-surface border border-subtle">
        <Skeleton className="w-[140px] h-[140px] rounded-full" />
        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-12" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  const pct = Math.round((current / max) * 100)
  const gaugeColor = pct >= 90
    ? 'var(--color-error)'
    : pct >= 70
    ? 'var(--color-warning)'
    : 'var(--color-success)'

  return (
    <div className="rounded-2xl p-6 flex items-center gap-8 bg-bg-surface border border-subtle">
      {/* Gauge */}
      <CircularProgress
        value={current}
        max={max}
        size={140}
        strokeWidth={12}
        color={gaugeColor}
        label="Aforo"
      />

      {/* Stats */}
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            Aforo en vivo
          </p>
          <p className="text-xl font-bold text-text-primary mt-0.5">
            {current} / {max}{' '}
            <span className="text-base font-normal text-text-secondary">
              Personas dentro
            </span>
          </p>
        </div>

        <div className="flex gap-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Ingresos hoy
            </p>
            <p className="text-2xl font-bold mt-0.5 text-success-500">
              {entries}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
              Egresos hoy
            </p>
            <p className="text-2xl font-bold mt-0.5 text-error-500">
              {exits}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
