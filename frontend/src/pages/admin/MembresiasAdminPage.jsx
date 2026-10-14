import { useState } from 'react'
import { BadgeCheck, Search, SlidersHorizontal } from 'lucide-react'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Skeleton from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import {
  useMembresiasAdmin,
  useSuspenderMembresiaMutation,
  useReactivarMembresiaMutation,
  useCancelarMembresiaMutation,
  useRenovarMembresiaMutation,
} from '../../hooks/queries/useMembresias'
import { membresiaEstadoVariant, membresiaEstadoLabel } from '../../constants/membresias'

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// ─── Action modal ──────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  suspender: 'Suspender membresía',
  reactivar: 'Reactivar membresía',
  cancelar: 'Cancelar membresía',
  renovar: 'Renovar membresía',
}

const ACTION_DESCRIPTIONS = {
  suspender: 'El socio no podrá acceder mientras la membresía esté suspendida.',
  reactivar: 'La membresía volverá al estado activo, extendiendo la fecha de fin por los días de suspensión.',
  cancelar: 'La membresía quedará cancelada de forma permanente.',
  renovar: 'Se generará una nueva membresía activa.',
}

function AccionMembresiaModal({ isOpen, onClose, membresia, accion, onConfirm, isPending }) {
  const [motivo, setMotivo] = useState('')

  const handleClose = () => {
    setMotivo('')
    onClose()
  }

  const handleConfirm = () => {
    onConfirm({ id: membresia.id, motivo, socioId: membresia.socio })
    setMotivo('')
  }

  if (!membresia || !accion) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={ACTION_LABELS[accion]}
      description={ACTION_DESCRIPTIONS[accion]}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="p-3 rounded-xl bg-bg-raised border border-subtle text-sm text-text-secondary">
          <strong className="text-text-primary">
            {membresia.socio_nombre ?? `Socio #${membresia.socio}`}
          </strong>{' '}
          — Plan: {membresia.plan_nombre ?? '—'} ({formatDate(membresia.fecha_inicio)} → {formatDate(membresia.fecha_fin)})
        </div>

        <div>
          <label
            htmlFor="motivo-accion"
            className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2"
          >
            Motivo {accion === 'suspender' || accion === 'cancelar' ? '(requerido)' : '(opcional)'}
          </label>
          <textarea
            id="motivo-accion"
            data-testid="motivo-input"
            rows={3}
            maxLength={300}
            placeholder="Describí el motivo de esta acción..."
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors py-2.5 px-3 text-sm resize-none"
          />
          <p className="text-[10px] text-text-tertiary text-right mt-0.5">{motivo.length}/300</p>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={isPending}
            disabled={
              isPending ||
              ((accion === 'suspender' || accion === 'cancelar') && !motivo.trim())
            }
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Row actions ───────────────────────────────────────────────────────────────

function AccionesRow({ membresia, onAccion }) {
  const estado = membresia.estado

  return (
    <div className="flex flex-wrap gap-1.5">
      {estado === 'activa' && (
        <>
          <button
            type="button"
            onClick={() => onAccion('suspender', membresia)}
            className="text-xs px-2.5 py-1 rounded-md bg-warning-500/10 text-warning-500 border border-warning-500/20 hover:bg-warning-500/20 transition-colors"
          >
            Suspender
          </button>
          <button
            type="button"
            onClick={() => onAccion('cancelar', membresia)}
            className="text-xs px-2.5 py-1 rounded-md bg-error-500/10 text-error-500 border border-error-500/20 hover:bg-error-500/20 transition-colors"
          >
            Cancelar
          </button>
        </>
      )}
      {estado === 'suspendida' && (
        <>
          <button
            type="button"
            onClick={() => onAccion('reactivar', membresia)}
            className="text-xs px-2.5 py-1 rounded-md bg-success-500/10 text-success-500 border border-success-500/20 hover:bg-success-500/20 transition-colors"
          >
            Reactivar
          </button>
          <button
            type="button"
            onClick={() => onAccion('cancelar', membresia)}
            className="text-xs px-2.5 py-1 rounded-md bg-error-500/10 text-error-500 border border-error-500/20 hover:bg-error-500/20 transition-colors"
          >
            Cancelar
          </button>
        </>
      )}
      {(estado === 'vencida' || estado === 'pendiente_pago') && (
        <button
          type="button"
          onClick={() => onAccion('renovar', membresia)}
          className="text-xs px-2.5 py-1 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          Renovar
        </button>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

const ESTADO_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'activa', label: 'Activa' },
  { value: 'suspendida', label: 'Suspendida' },
  { value: 'vencida', label: 'Vencida' },
  { value: 'cancelada', label: 'Cancelada' },
  { value: 'pendiente_pago', label: 'Pendiente pago' },
]

const VENC_OPTIONS = [
  { value: '', label: 'Cualquier vencimiento' },
  { value: 'proximos_7', label: 'Próximos 7 días' },
  { value: 'proximos_30', label: 'Próximos 30 días' },
  { value: 'vencidas', label: 'Ya vencidas' },
]

export default function MembresiasAdminPage() {
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroVenc, setFiltroVenc] = useState('')
  const [pagina, setPagina] = useState(1)

  const [modalAbierto, setModalAbierto] = useState(false)
  const [accionActual, setAccionActual] = useState(null) // 'suspender' | 'reactivar' | 'cancelar' | 'renovar'
  const [membresiaActual, setMembresiaActual] = useState(null)

  const params = { page: pagina, page_size: 20 }
  if (filtroEstado) params.estado = filtroEstado

  const { data, isLoading, isError } = useMembresiasAdmin(params)

  const membresias = data?.results ?? []
  const totalCount = data?.count ?? 0

  const suspender = useSuspenderMembresiaMutation({ onSuccess: () => setModalAbierto(false) })
  const reactivar = useReactivarMembresiaMutation({ onSuccess: () => setModalAbierto(false) })
  const cancelar = useCancelarMembresiaMutation({ onSuccess: () => setModalAbierto(false) })
  const renovar = useRenovarMembresiaMutation({ onSuccess: () => setModalAbierto(false) })

  const mutationMap = { suspender, reactivar, cancelar, renovar }
  const mutacionActiva = accionActual ? mutationMap[accionActual] : null

  const handleAccion = (accion, membresia) => {
    setAccionActual(accion)
    setMembresiaActual(membresia)
    setModalAbierto(true)
  }

  const handleConfirm = (payload) => {
    if (!accionActual) return
    mutationMap[accionActual].mutate(payload)
  }

  const filteredByVenc = (() => {
    if (!filtroVenc) return membresias
    const hoy = new Date()
    return membresias.filter((m) => {
      if (!m.fecha_fin) return filtroVenc === 'vencidas'
      const fin = new Date(m.fecha_fin)
      const diff = (fin - hoy) / (1000 * 60 * 60 * 24)
      if (filtroVenc === 'proximos_7') return diff >= 0 && diff <= 7
      if (filtroVenc === 'proximos_30') return diff >= 0 && diff <= 30
      if (filtroVenc === 'vencidas') return diff < 0
      return true
    })
  })()

  return (
    <AppLayout>
      <TopBar
        title="Membresías"
        subtitle={`${totalCount} membresías totales`}
      />

      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">
        {/* Filtros */}
        <Card className="p-4 flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 text-text-secondary">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-text-primary">Filtros</span>
          </div>

          <div className="flex flex-wrap gap-3 flex-1">
            <div className="min-w-[160px]">
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => { setFiltroEstado(e.target.value); setPagina(1) }}
                className="w-full bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3 appearance-none"
              >
                {ESTADO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            <div className="min-w-[180px]">
              <label className="block text-[10px] font-semibold text-text-secondary uppercase tracking-wider mb-1">
                Vencimiento
              </label>
              <select
                value={filtroVenc}
                onChange={(e) => setFiltroVenc(e.target.value)}
                className="w-full bg-bg-base border border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3 appearance-none"
              >
                {VENC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Table */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <EmptyState icon={Search} title="Error al cargar membresías" message="Intentá recargar la página" />
        ) : filteredByVenc.length === 0 ? (
          <EmptyState icon={BadgeCheck} title="Sin membresías" message="No hay membresías que coincidan con los filtros" />
        ) : (
          <div className="flex flex-col gap-2">
            {filteredByVenc.map((m) => (
              <Card key={m.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text-primary">
                      {m.socio_nombre ?? `Socio #${m.socio}`}
                    </span>
                    <Badge variant={membresiaEstadoVariant(m.estado)}>
                      {membresiaEstadoLabel(m.estado)}
                    </Badge>
                  </div>
                  <span className="text-xs text-text-secondary">
                    {m.plan_nombre ?? '—'} · {formatDate(m.fecha_inicio)} → {formatDate(m.fecha_fin)}
                  </span>
                </div>
                <AccionesRow membresia={m} onAccion={handleAccion} />
              </Card>
            ))}

            {/* Simple pagination */}
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
                  disabled={membresias.length < 20}
                >
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <AccionMembresiaModal
        isOpen={modalAbierto}
        onClose={() => setModalAbierto(false)}
        membresia={membresiaActual}
        accion={accionActual}
        onConfirm={handleConfirm}
        isPending={mutacionActiva?.isPending ?? false}
      />
    </AppLayout>
  )
}
