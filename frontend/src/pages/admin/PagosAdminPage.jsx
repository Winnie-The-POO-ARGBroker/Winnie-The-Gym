import { useState } from 'react'
import { CreditCard, Search, Download, X, Eye, FileDown } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { usePagosAdmin, usePagosTotales, useAnularPagoMutation } from '../../hooks/queries/usePagos'
import { pagoEstadoVariant, pagoEstadoLabel } from '../../constants/pagos'
import { exportReport } from '../../services/reportsService'
import { descargarComprobante } from '../../services/pagosService'
import { toast } from 'sonner'

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatMonto(monto) {
  if (monto == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(monto)
}

// ─── Totales cards ─────────────────────────────────────────────────────────────

function TotalesCards({ totales, loading }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
    )
  }

  const cards = [
    { label: 'Aprobados', value: totales?.total_aprobado, variant: 'success', count: null },
    { label: 'Pendientes', value: totales?.total_pendiente, variant: 'warning', count: null },
    { label: 'Rechazados', value: totales?.total_rechazado, variant: 'danger', count: null },
    { label: 'Total registros', value: null, variant: 'neutral', count: totales?.count },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4" data-testid="totales-cards">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
            {c.label}
          </span>
          <span className="text-xl font-bold text-text-primary">
            {c.count != null ? c.count : (c.value != null ? formatMonto(c.value) : '—')}
          </span>
          <Badge variant={c.variant} className="self-start text-[10px]">
            {c.variant}
          </Badge>
        </Card>
      ))}
    </div>
  )
}

// ─── Detalle modal ─────────────────────────────────────────────────────────────

function PagoDetalleModal({ isOpen, onClose, pago }) {
  const [motivoAnular, setMotivoAnular] = useState('')
  const [confirmandoAnular, setConfirmandoAnular] = useState(false)
  const [descargando, setDescargando] = useState(false)
  const anular = useAnularPagoMutation({ onSuccess: () => { setConfirmandoAnular(false); onClose() } })

  const handleDescargarComprobante = async () => {
    if (!pago) return
    setDescargando(true)
    try {
      await descargarComprobante(pago.id)
    } catch {
      toast.error('No se pudo descargar el comprobante.')
    } finally {
      setDescargando(false)
    }
  }

  const handleClose = () => {
    setMotivoAnular('')
    setConfirmandoAnular(false)
    onClose()
  }

  if (!pago) return null

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Detalle del pago" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4 pb-2">
        {/* Fields grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'ID', value: pago.id },
            { label: 'Estado', value: <Badge variant={pagoEstadoVariant(pago.estado)}>{pagoEstadoLabel(pago.estado)}</Badge> },
            { label: 'Socio', value: pago.socio_nombre ?? `#${pago.socio}` },
            { label: 'DNI Socio', value: pago.socio_dni ?? '—' },
            { label: 'Plan', value: pago.plan_nombre ?? '—' },
            { label: 'Monto', value: formatMonto(pago.monto) },
            { label: 'Método', value: pago.metodo ?? '—' },
            { label: 'Medio manual', value: pago.medio_manual ?? '—' },
            { label: 'Cobrado por', value: pago.cobrado_por_nombre ?? '—' },
            { label: 'Fecha', value: formatDate(pago.paid_at ?? pago.created_at) },
            { label: 'MP Payment ID', value: pago.mp_payment_id ?? '—' },
            { label: 'MP Status Detail', value: pago.mp_status_detail ?? '—' },
          ].map(({ label, value }) => (
            <div key={label} className="p-2.5 rounded-lg bg-bg-raised border border-subtle">
              <span className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-0.5">
                {label}
              </span>
              <span className="text-sm text-text-primary">{value}</span>
            </div>
          ))}
        </div>

        {/* Comprobante — only for approved payments */}
        {pago.estado === 'aprobado' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleDescargarComprobante}
            loading={descargando}
            className="gap-1.5 self-start"
          >
            <FileDown className="w-3.5 h-3.5" />
            Descargar comprobante
          </Button>
        )}

        {/* Observacion */}
        {pago.observacion && (
          <div className="p-3 rounded-xl bg-bg-raised border border-subtle">
            <span className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Observación
            </span>
            <p className="text-sm text-text-primary whitespace-pre-wrap">{pago.observacion}</p>
          </div>
        )}

        {/* Anulacion info */}
        {pago.anulado && (
          <div className="p-3 rounded-xl bg-error-500/10 border border-error-500/20">
            <span className="block text-[10px] font-semibold text-error-500 uppercase tracking-wider mb-1">
              Anulado
            </span>
            <p className="text-xs text-text-primary">
              Por: {pago.anulado_por_nombre ?? '—'} · {formatDate(pago.anulado_en)}
            </p>
            {pago.motivo_anulacion && (
              <p className="text-xs text-text-secondary mt-0.5">{pago.motivo_anulacion}</p>
            )}
          </div>
        )}

        {/* Admin: anular button for aprobado payments */}
        {pago.estado === 'aprobado' && !pago.anulado && (
          <div className="border-t border-subtle pt-4">
            {!confirmandoAnular ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmandoAnular(true)}
                className="text-error-500 border-error-500/30 hover:bg-error-500/10"
              >
                <X className="w-3.5 h-3.5" />
                Anular pago
              </Button>
            ) : (
              <div className="flex flex-col gap-3">
                <textarea
                  rows={2}
                  placeholder="Motivo de anulación (requerido)"
                  value={motivoAnular}
                  onChange={(e) => setMotivoAnular(e.target.value)}
                  className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-error-500 focus:border-error-500 transition-colors py-2 px-3 text-sm resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setConfirmandoAnular(false)}
                    disabled={anular.isPending}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={anular.isPending}
                    disabled={!motivoAnular.trim() || anular.isPending}
                    onClick={() => anular.mutate({ id: pago.id, motivo: motivoAnular })}
                    className="bg-error-500 hover:bg-error-600"
                  >
                    Confirmar anulación
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'aprobado', label: 'Aprobado' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'rechazado', label: 'Rechazado' },
  { value: 'cancelado', label: 'Cancelado' },
]

const METODO_OPTIONS = [
  { value: '', label: 'Todos los métodos' },
  { value: 'mercado_pago', label: 'MercadoPago' },
  { value: 'manual', label: 'Cobro manual' },
]

export default function PagosAdminPage() {
  const [filtros, setFiltros] = useState({
    estado: '',
    metodo: '',
    search: '',
    paid_at_gte: '',
    paid_at_lte: '',
    plan_id: '',
  })
  const [pagina, setPagina] = useState(1)
  const [pagoDetalle, setPagoDetalle] = useState(null)
  const [exportando, setExportando] = useState(false)

  const params = { page: pagina, page_size: 20 }
  if (filtros.estado) params.estado = filtros.estado
  if (filtros.metodo) params.metodo = filtros.metodo
  if (filtros.search) params.search = filtros.search
  if (filtros.paid_at_gte) params.paid_at_gte = filtros.paid_at_gte
  if (filtros.paid_at_lte) params.paid_at_lte = filtros.paid_at_lte
  if (filtros.plan_id) params.plan_id = filtros.plan_id

  const { data, isLoading, isError } = usePagosAdmin(params)
  const { data: totales, isLoading: loadingTotales } = usePagosTotales(params)

  const pagos = data?.results ?? []
  const totalCount = data?.count ?? 0

  const setFiltro = (key, value) => {
    setFiltros((prev) => ({ ...prev, [key]: value }))
    setPagina(1)
  }

  const handleExport = async (formato) => {
    setExportando(true)
    try {
      await exportReport('facturacion', {
        mes: '',
        fecha_desde: filtros.paid_at_gte,
        fecha_hasta: filtros.paid_at_lte,
        estado: filtros.estado,
        plan_id: filtros.plan_id,
      }, formato)
      toast.success(`Reporte exportado en ${formato.toUpperCase()}`)
    } catch (err) {
      toast.error(err.message || 'Error al exportar')
    } finally {
      setExportando(false)
    }
  }

  return (
    <AppLayout>
      <TopBar
        title="Pagos"
        subtitle={`${totalCount} registros`}
        rightContent={
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('csv')}
              loading={exportando}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('xlsx')}
              loading={exportando}
              className="gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              XLSX
            </Button>
          </div>
        }
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* Totales */}
        <TotalesCards totales={totales} loading={loadingTotales} />

        {/* Filtros */}
        <Card className="p-4 flex flex-wrap gap-4">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Buscar socio / DNI
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                type="text"
                placeholder="Nombre, apellido o DNI"
                value={filtros.search}
                onChange={(e) => setFiltro('search', e.target.value)}
                className="w-full bg-bg-base border border-subtle rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary py-2 pl-8 pr-3"
              />
            </div>
          </div>

          <div className="min-w-[130px]">
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Estado
            </label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltro('estado', e.target.value)}
              className="w-full bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3 appearance-none"
            >
              {ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[160px]">
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Método
            </label>
            <select
              value={filtros.metodo}
              onChange={(e) => setFiltro('metodo', e.target.value)}
              className="w-full bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3 appearance-none"
            >
              {METODO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Desde
            </label>
            <input
              type="date"
              value={filtros.paid_at_gte}
              onChange={(e) => setFiltro('paid_at_gte', e.target.value)}
              className="w-full bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3"
            />
          </div>

          <div className="min-w-[140px]">
            <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={filtros.paid_at_lte}
              onChange={(e) => setFiltro('paid_at_lte', e.target.value)}
              className="w-full bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3"
            />
          </div>
        </Card>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <EmptyState icon={Search} title="Error al cargar pagos" message="Intentá recargar la página" />
        ) : pagos.length === 0 ? (
          <EmptyState icon={CreditCard} title="Sin pagos" message="No hay pagos que coincidan con los filtros" />
        ) : (
          <div className="flex flex-col gap-2">
            {pagos.map((p) => (
              <Card
                key={p.id}
                className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between cursor-pointer hover:bg-bg-raised transition-colors"
                onClick={() => setPagoDetalle(p)}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {p.socio_nombre ?? `#${p.socio}`}
                    </span>
                    {p.socio_dni && (
                      <span className="text-xs text-text-tertiary font-mono">DNI {p.socio_dni}</span>
                    )}
                    <Badge variant={pagoEstadoVariant(p.estado)}>{pagoEstadoLabel(p.estado)}</Badge>
                    {p.anulado && <Badge variant="danger">Anulado</Badge>}
                  </div>
                  <span className="text-xs text-text-secondary">
                    {p.plan_nombre ?? '—'} · {p.metodo ?? '—'} · {formatDate(p.paid_at ?? p.created_at)}
                    {p.cobrado_por_nombre && ` · Cobrado por: ${p.cobrado_por_nombre}`}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-base font-bold text-text-primary">{formatMonto(p.monto)}</span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPagoDetalle(p) }}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                    aria-label="Ver detalle"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </Card>
            ))}

            {/* Pagination */}
            {totalCount > 20 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagina((p) => Math.max(1, p - 1))}
                  disabled={pagina === 1}
                >
                  Anterior
                </Button>
                <span className="text-xs text-text-secondary">
                  Página {pagina} · {totalCount} resultados
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPagina((p) => p + 1)}
                  disabled={pagos.length < 20}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <PagoDetalleModal
        isOpen={!!pagoDetalle}
        onClose={() => setPagoDetalle(null)}
        pago={pagoDetalle}
      />
    </AppLayout>
  )
}
