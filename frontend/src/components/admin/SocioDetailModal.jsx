import { useState } from 'react'
import {
  X,
  User,
  Phone,
  Calendar,
  FileCheck,
  FileX,
  FileText,
  Clock,
  Edit2,
  ExternalLink,
  CreditCard,
  BadgeCheck,
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Skeleton from '../ui/Skeleton'
import Modal from '../ui/Modal'
import {
  useMembresiasPorSocio,
  useSuspenderMembresiaMutation,
  useReactivarMembresiaMutation,
  useCancelarMembresiaMutation,
  useRenovarMembresiaMutation,
} from '../../hooks/queries/useMembresias'
import { usePagosPorSocio } from '../../hooks/queries/usePagos'
import { pagoEstadoVariant, pagoEstadoLabel } from '../../constants/pagos'
import { membresiaEstadoVariant, membresiaEstadoLabel } from '../../constants/membresias'

const TABS = [
  { key: 'datos', label: 'Datos' },
  { key: 'membresias', label: 'Membresías' },
  { key: 'pagos', label: 'Pagos' },
]

function formatDate(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// Estado helpers now delegate to the shared constants maps
const estadoMembresiaVariant = membresiaEstadoVariant
const estadoPagoVariant = pagoEstadoVariant

// ─── Tab: Datos ───────────────────────────────────────────────────────────────

function TabDatos({ socio }) {
  const tieneCertificado = !!socio.certificado_medico_url

  return (
    <div className="py-4 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-orange-500" /> DNI
          </span>
          <span className="text-sm font-semibold text-text-primary font-mono">
            {socio.dni || '—'}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-orange-500" /> Teléfono
          </span>
          <span className="text-sm font-semibold text-text-primary">
            {socio.telefono || 'Sin teléfono'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-info-500" /> Fecha de Alta
          </span>
          <span className="text-sm text-text-primary">{formatDate(socio.created_at)}</span>
        </div>

        <div className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1">
          <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-error-500" /> Fecha de Baja
          </span>
          <span className="text-sm text-text-primary">
            {socio.fecha_baja ? formatDate(socio.fecha_baja) : 'No aplica'}
          </span>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-2">
        <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
          Certificado Médico (Apto Físico)
        </span>
        {tieneCertificado ? (
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-success-500/10 border border-success-500/20 text-success-500">
            <div className="flex items-center gap-2 text-xs font-medium">
              <FileCheck className="w-4 h-4" />
              <span>Certificado vigente cargado</span>
            </div>
            <a
              href={socio.certificado_medico_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold underline hover:text-emerald-400 transition-colors"
            >
              Abrir archivo <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error-500/10 border border-error-500/20 text-error-500 text-xs font-medium">
            <FileX className="w-4 h-4" />
            <span>No posee certificado médico cargado en el sistema</span>
          </div>
        )}
      </div>

      <div className="p-3.5 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1.5">
        <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5 uppercase tracking-wider">
          <FileText className="w-3.5 h-3.5 text-text-secondary" /> Observaciones y Salud
        </span>
        <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
          {socio.observaciones || 'Sin observaciones registradas.'}
        </p>
      </div>
    </div>
  )
}

// ─── Tab: Membresías ──────────────────────────────────────────────────────────

function MiniAccionModal({ isOpen, onClose, membresia, accion, onConfirm, isPending }) {
  const [motivo, setMotivo] = useState('')
  const handleClose = () => { setMotivo(''); onClose() }
  const handleConfirm = () => { onConfirm({ id: membresia.id, motivo, socioId: membresia.socio }); setMotivo('') }
  if (!membresia || !accion) return null
  const labels = { suspender: 'Suspender', reactivar: 'Reactivar', cancelar: 'Cancelar', renovar: 'Renovar' }
  const requiresMotivo = accion === 'suspender' || accion === 'cancelar'
  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`${labels[accion]} membresía`} maxWidth="max-w-sm">
      <div className="flex flex-col gap-3">
        <textarea
          rows={2}
          maxLength={300}
          placeholder={requiresMotivo ? 'Motivo (requerido)' : 'Motivo (opcional)'}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full bg-bg-base border border-subtle rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary py-2 px-3 text-sm resize-none"
        />
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={handleClose} disabled={isPending}>Cancelar</Button>
          <Button
            variant="primary"
            size="sm"
            loading={isPending}
            disabled={isPending || (requiresMotivo && !motivo.trim())}
            onClick={handleConfirm}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function TabMembresias({ socioId }) {
  const { data: membresias = [], isPending: loading } = useMembresiasPorSocio(socioId)
  const [accionModal, setAccionModal] = useState(null) // { accion, membresia }

  const suspender = useSuspenderMembresiaMutation({ onSuccess: () => setAccionModal(null) })
  const reactivar = useReactivarMembresiaMutation({ onSuccess: () => setAccionModal(null) })
  const cancelar = useCancelarMembresiaMutation({ onSuccess: () => setAccionModal(null) })
  const renovar = useRenovarMembresiaMutation({ onSuccess: () => setAccionModal(null) })

  const mutMap = { suspender, reactivar, cancelar, renovar }
  const pending = accionModal ? (mutMap[accionModal.accion]?.isPending ?? false) : false

  const handleConfirm = (payload) => {
    if (!accionModal) return
    mutMap[accionModal.accion].mutate(payload)
  }

  if (loading) {
    return (
      <div className="py-4 flex flex-col gap-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    )
  }

  if (membresias.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-secondary flex flex-col items-center gap-2">
        <BadgeCheck className="w-8 h-8 text-text-tertiary" />
        <p>No hay membresías registradas para este socio.</p>
      </div>
    )
  }

  return (
    <div className="py-4 flex flex-col gap-3">
      {membresias.map((m) => (
        <div key={m.id} className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-text-primary">
                {m.plan_nombre ?? m.plan ?? '—'}
              </span>
              <span className="text-xs text-text-secondary">
                {formatDate(m.fecha_inicio)} → {formatDate(m.fecha_fin)}
              </span>
            </div>
            <Badge variant={estadoMembresiaVariant(m.estado)}>
              {membresiaEstadoLabel(m.estado)}
            </Badge>
          </div>
          {/* Action buttons */}
          <div className="flex flex-wrap gap-1.5 pt-1 border-t border-subtle">
            {m.estado === 'activa' && (
              <>
                <button type="button" onClick={() => setAccionModal({ accion: 'suspender', membresia: m })}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-warning-500/10 text-warning-500 border border-warning-500/20 hover:bg-warning-500/20">
                  Suspender
                </button>
                <button type="button" onClick={() => setAccionModal({ accion: 'cancelar', membresia: m })}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-error-500/10 text-error-500 border border-error-500/20 hover:bg-error-500/20">
                  Cancelar
                </button>
              </>
            )}
            {m.estado === 'suspendida' && (
              <>
                <button type="button" onClick={() => setAccionModal({ accion: 'reactivar', membresia: m })}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-success-500/10 text-success-500 border border-success-500/20 hover:bg-success-500/20">
                  Reactivar
                </button>
                <button type="button" onClick={() => setAccionModal({ accion: 'cancelar', membresia: m })}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-error-500/10 text-error-500 border border-error-500/20 hover:bg-error-500/20">
                  Cancelar
                </button>
              </>
            )}
            {(m.estado === 'vencida' || m.estado === 'pendiente_pago') && (
              <button type="button" onClick={() => setAccionModal({ accion: 'renovar', membresia: m })}
                className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                Renovar
              </button>
            )}
          </div>
        </div>
      ))}

      <MiniAccionModal
        isOpen={!!accionModal}
        onClose={() => setAccionModal(null)}
        membresia={accionModal?.membresia}
        accion={accionModal?.accion}
        onConfirm={handleConfirm}
        isPending={pending}
      />
    </div>
  )
}

// ─── Tab: Pagos ───────────────────────────────────────────────────────────────

function TabPagos({ socioId }) {
  const { data: pagos = [], isPending: loading } = usePagosPorSocio(socioId)

  if (loading) {
    return (
      <div className="py-4 flex flex-col gap-3">
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-14 rounded-xl" />
      </div>
    )
  }

  if (pagos.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-secondary flex flex-col items-center gap-2">
        <CreditCard className="w-8 h-8 text-text-tertiary" />
        <p>No hay pagos registrados para este socio.</p>
      </div>
    )
  }

  return (
    <div className="py-4 flex flex-col gap-3">
      {pagos.map((p) => (
        <div key={p.id} className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-text-primary">
                {p.plan_nombre ?? p.plan ?? '—'}
              </span>
              <span className="text-xs text-text-secondary font-mono">
                {formatDate(p.created_at)} · {p.medio_manual ?? p.metodo ?? '—'}
              </span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-bold text-text-primary">
                {p.monto != null
                  ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.monto)
                  : '—'}
              </span>
              <Badge variant={estadoPagoVariant(p.estado)}>{pagoEstadoLabel(p.estado)}</Badge>
            </div>
          </div>
          {/* Audit fields */}
          {(p.cobrado_por_nombre || p.observacion) && (
            <div className="text-[11px] text-text-tertiary flex flex-col gap-0.5 pt-1 border-t border-subtle">
              {p.cobrado_por_nombre && <span>Cobrado por: {p.cobrado_por_nombre}</span>}
              {p.observacion && <span className="italic">{p.observacion}</span>}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SocioDetailModal({ isOpen, onClose, socio, onEditar }) {
  const [activeTab, setActiveTab] = useState('datos')

  if (!socio) return null

  const estadoSocio = (socio.estado || '').toLowerCase()

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-subtle">
        <div className="flex items-center gap-3">
          <Avatar
            name={`${socio.nombre || ''} ${socio.apellido || ''}`.trim() || 'Socio'}
            size="lg"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-text-primary">
                {socio.nombre} {socio.apellido}
              </h3>
              {estadoSocio === 'activo' && <Badge variant="success">Activo</Badge>}
              {estadoSocio === 'suspendido' && <Badge variant="warning">Suspendido</Badge>}
              {estadoSocio === 'baja' && <Badge variant="danger">Baja</Badge>}
            </div>
            <p className="text-xs text-text-secondary">
              Socio Nº {socio.numero_socio || socio.id}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
          aria-label="Cerrar detalle"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 pt-4 border-b border-subtle">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
              activeTab === tab.key
                ? 'border-b-2 border-primary text-primary bg-transparent'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[200px]">
        {activeTab === 'datos' && <TabDatos socio={socio} />}
        {activeTab === 'membresias' && <TabMembresias socioId={socio.id} />}
        {activeTab === 'pagos' && <TabPagos socioId={socio.id} />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-subtle">
        {onEditar ? (
          <Button
            variant="secondary"
            onClick={() => {
              onClose()
              onEditar(socio)
            }}
            className="gap-2"
          >
            <Edit2 className="w-4 h-4 text-orange-500" /> Editar Datos
          </Button>
        ) : (
          <div />
        )}

        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </Modal>
  )
}
