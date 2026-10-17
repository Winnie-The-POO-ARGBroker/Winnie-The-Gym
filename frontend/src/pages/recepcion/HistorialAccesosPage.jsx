import { useState } from 'react'
import { Download, Search, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import EmptyState from '../../components/ui/EmptyState'
import { useAccessLogs } from '../../hooks/queries/useAccessLogs'
import { ACCESS_DENIAL_REASONS } from '../../constants/accessDenialReasons'
import api from '../../services/api'

const ACCESS_TYPES = [
  { value: '', label: 'Todos los tipos' },
  { value: 'ENTRADA', label: 'Entrada' },
  { value: 'SALIDA', label: 'Salida' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'GRANTED', label: 'Permitido' },
  { value: 'DENIED', label: 'Denegado' },
]

const DENIAL_REASON_OPTIONS = [
  { value: '', label: 'Todos los motivos' },
  ...Object.entries(ACCESS_DENIAL_REASONS).map(([value, label]) => ({ value, label })),
]

const PAGE_SIZE = 20

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

export default function HistorialAccesosPage() {
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    access_type: '',
    denial_reason: '',
    fecha_desde: '',
    fecha_hasta: '',
    hora_desde: '',
    hora_hasta: '',
  })
  const [page, setPage] = useState(1)
  const [isExporting, setIsExporting] = useState(null)

  const queryParams = {
    page,
    page_size: PAGE_SIZE,
    ...(filters.search && { search: filters.search }),
    ...(filters.status && { status: filters.status }),
    ...(filters.access_type && { access_type: filters.access_type }),
    ...(filters.denial_reason && { denial_reason: filters.denial_reason }),
    ...(filters.fecha_desde && { fecha_desde: filters.fecha_desde }),
    ...(filters.fecha_hasta && { fecha_hasta: filters.fecha_hasta }),
    ...(filters.hora_desde && { hora_desde: filters.hora_desde }),
    ...(filters.hora_hasta && { hora_hasta: filters.hora_hasta }),
  }

  const { data, isLoading } = useAccessLogs(queryParams)

  const logs = data?.results ?? []
  const totalCount = data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const hasActiveFilters = Object.entries(filters).some(([, v]) => v !== '')

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
    setPage(1)
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      access_type: '',
      denial_reason: '',
      fecha_desde: '',
      fecha_hasta: '',
      hora_desde: '',
      hora_hasta: '',
    })
    setPage(1)
  }

  const handleExport = async (format) => {
    setIsExporting(format)
    const toastId = toast.loading(`Exportando accesos en ${format.toUpperCase()}...`)
    try {
      const params = { ...queryParams, format }
      delete params.page
      delete params.page_size
      const res = await api.get('/access/logs/export/', {
        params,
        responseType: 'blob',
      })
      const mimeMap = {
        csv: 'text/csv',
        xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
      }
      const blob = new Blob([res.data], { type: mimeMap[format] ?? 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `historial-accesos.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Historial exportado`, { id: toastId })
    } catch {
      toast.error('Error al exportar. Intentá nuevamente.', { id: toastId })
    } finally {
      setIsExporting(null)
    }
  }

  return (
    <AppLayout>
      <TopBar
        title="Historial de accesos"
        subtitle={`${totalCount.toLocaleString('es-AR')} registros`}
        backAction={{ to: '/dashboard' }}
        rightContent={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={!!isExporting}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('xlsx')}
              disabled={!!isExporting}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Excel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={!!isExporting}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              PDF
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 overflow-auto">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 p-4 rounded-xl bg-bg-surface border border-subtle">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar por DNI, nombre o apellido..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Status */}
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Access type */}
          <select
            value={filters.access_type}
            onChange={(e) => handleFilterChange('access_type', e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
          >
            {ACCESS_TYPES.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Denial reason — only relevant when status = DENIED or no filter */}
          <select
            value={filters.denial_reason}
            onChange={(e) => handleFilterChange('denial_reason', e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors max-w-[240px]"
          >
            {DENIAL_REASON_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={filters.fecha_desde}
            onChange={(e) => handleFilterChange('fecha_desde', e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
            title="Fecha desde"
          />
          <input
            type="date"
            value={filters.fecha_hasta}
            onChange={(e) => handleFilterChange('fecha_hasta', e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
            title="Fecha hasta"
          />

          {/* Time range */}
          <input
            type="time"
            value={filters.hora_desde}
            onChange={(e) => handleFilterChange('hora_desde', e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
            title="Hora desde"
          />
          <input
            type="time"
            value={filters.hora_hasta}
            onChange={(e) => handleFilterChange('hora_hasta', e.target.value)}
            className="px-3 py-2 rounded-xl bg-bg-raised border border-subtle text-text-primary text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ring-offset-bg-base focus:border-orange-500 transition-colors"
            title="Hora hasta"
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-error-500 border border-error-500/30 hover:bg-error-500/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpiar
            </button>
          )}
        </div>

        {/* Table */}
        <div className="rounded-xl bg-bg-surface border border-subtle overflow-hidden">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={Filter}
                title="Sin resultados"
                message={hasActiveFilters ? 'No hay accesos que coincidan con los filtros.' : 'No hay registros de acceso aún.'}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-subtle bg-bg-raised/40">
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Fecha y hora</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Socio</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Tipo</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Estado</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Motivo denegación</th>
                    <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-text-secondary">Plan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-subtle">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-bg-raised/20 transition-colors">
                      <td className="py-3 px-4 text-xs text-text-secondary font-mono whitespace-nowrap">
                        {formatDateTime(log.timestamp ?? log.created_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm font-semibold text-text-primary">
                          {log.socio_nombre ?? log.user_nombre ?? '—'}
                        </div>
                        <div className="text-[11px] text-text-tertiary font-mono">
                          DNI {log.socio_dni ?? log.user_dni ?? '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-text-primary">
                        {log.access_type ?? '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadgeVariant(log.status)}>
                          {statusLabel(log.status)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-xs text-text-secondary">
                        {log.denial_reason
                          ? (ACCESS_DENIAL_REASONS[log.denial_reason] ?? log.denial_reason)
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-xs text-text-secondary">
                        {log.user_plan_nombre ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Página {page} de {totalPages} · {totalCount.toLocaleString('es-AR')} registros
            </span>
            <div className="flex items-center gap-2">
              <button
                aria-label="Página anterior"
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-2 rounded-lg border border-subtle hover:bg-bg-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                aria-label="Página siguiente"
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
    </AppLayout>
  )
}
