import { useState } from 'react'
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react'
import MemberLayout from '../../components/layout/MemberLayout'
import Badge from '../../components/ui/Badge'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { useMiActividad } from '../../hooks/queries/useAccessLogs'
import { ACCESS_DENIAL_REASONS } from '../../constants/accessDenialReasons'

const PAGE_SIZE = 15

function formatDateTime(str) {
  if (!str) return '—'
  return new Date(str).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function statusBadgeVariant(status) {
  if (status === 'GRANTED') return 'success'
  if (status === 'DENIED') return 'danger'
  return 'default'
}

function statusLabel(status) {
  if (status === 'GRANTED') return 'Permitido'
  if (status === 'DENIED') return 'Denegado'
  return status ?? '—'
}

export default function MiActividadPage() {
  const [page, setPage] = useState(1)

  const { data, isLoading } = useMiActividad({ page, page_size: PAGE_SIZE })

  const resumen = data?.resumen ?? {}
  const logs = data?.logs?.results ?? data?.logs ?? []
  const totalCount = data?.logs?.count ?? logs.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <MemberLayout title="Mi Actividad" subtitle="Historial de accesos al gimnasio">
      <div className="flex flex-col gap-4 w-full animate-fadeIn">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-bg-surface border border-subtle flex flex-col gap-1">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Accesos este mes
            </span>
            {isLoading ? (
              <Skeleton className="h-7 w-12 rounded" />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {resumen.accesos_mes ?? 0}
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-subtle flex flex-col gap-1">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Último acceso
            </span>
            {isLoading ? (
              <Skeleton className="h-7 w-24 rounded" />
            ) : (
              <span className="text-sm font-semibold text-text-primary">
                {resumen.ultimo_acceso ? formatDate(resumen.ultimo_acceso) : '—'}
              </span>
            )}
          </div>

          <div className="p-3 rounded-xl bg-bg-surface border border-subtle flex flex-col gap-1">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Rechazos
            </span>
            {isLoading ? (
              <Skeleton className="h-7 w-8 rounded" />
            ) : (
              <span className={`text-2xl font-bold ${resumen.rechazos_mes > 0 ? 'text-error-500' : 'text-text-primary'}`}>
                {resumen.rechazos_mes ?? 0}
              </span>
            )}
          </div>
        </div>

        {/* Access log table */}
        <div className="rounded-xl bg-bg-surface border border-subtle overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Activity}
                title="Sin movimientos"
                message="Aún no tenés movimientos de acceso."
              />
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-subtle">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 hover:bg-bg-raised/20 transition-colors">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold text-text-primary">
                      {formatDateTime(log.timestamp ?? log.created_at)}
                    </span>
                    <span className="text-[11px] text-text-secondary">
                      {log.access_type ?? '—'}
                      {log.denial_reason && (
                        <span className="ml-1 text-error-500">
                          · {ACCESS_DENIAL_REASONS[log.denial_reason] ?? log.denial_reason}
                        </span>
                      )}
                    </span>
                  </div>
                  <Badge variant={statusBadgeVariant(log.status)}>
                    {statusLabel(log.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Página {page} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-subtle hover:bg-bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-2 rounded-lg border border-subtle hover:bg-bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </MemberLayout>
  )
}
