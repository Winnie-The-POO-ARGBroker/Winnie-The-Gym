import Badge from '../ui/Badge'
import Skeleton from '../ui/Skeleton'

export default function ClassCapacityList({ classes = [], loading = false }) {
  return (
    <div className="rounded-2xl p-5 flex flex-col gap-1 bg-bg-surface border border-subtle">
      <h2 className="text-base font-semibold text-text-primary mb-3">Cupos de clases</h2>
      {loading
        ? Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-bg-raised">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))
        : classes.map((c) => {
            const isFull = c.current >= c.max
            return (
              <div
                key={c.id}
                className="flex items-center justify-between py-2.5 border-b border-bg-raised"
              >
                <p className="text-sm font-medium text-text-primary">{c.name}</p>
                {isFull ? (
                  <Badge variant="danger">Lleno</Badge>
                ) : (
                  <Badge variant="warning">
                    {c.current} / {c.max}
                  </Badge>
                )}
              </div>
            )
          })}
    </div>
  )
}
