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
import { useMembresiasPorSocio } from '../../hooks/queries/useMembresias'
import { usePagosPorSocio } from '../../hooks/queries/usePagos'

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

function estadoMembresiaVariant(estado) {
  switch (estado) {
    case 'activa': return 'success'
    case 'vencida': return 'danger'
    case 'pendiente': return 'warning'
    default: return 'neutral'
  }
}

function estadoPagoVariant(estado) {
  switch (estado) {
    case 'aprobado': return 'success'
    case 'pendiente': return 'warning'
    case 'rechazado': return 'danger'
    default: return 'neutral'
  }
}

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

function TabMembresias({ socioId }) {
  const { data: membresias = [], isPending: loading } = useMembresiasPorSocio(socioId)

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
        <div key={m.id} className="p-3 rounded-xl bg-bg-raised border border-subtle flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-text-primary">
              {m.plan_nombre ?? m.plan ?? '—'}
            </span>
            <span className="text-xs text-text-secondary">
              {formatDate(m.fecha_inicio)} → {formatDate(m.fecha_fin)}
            </span>
          </div>
          <Badge variant={estadoMembresiaVariant(m.estado)}>
            {m.estado ?? '—'}
          </Badge>
        </div>
      ))}
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
        <div key={p.id} className="p-3 rounded-xl bg-bg-raised border border-subtle flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-text-primary">
              {p.plan_nombre ?? p.plan ?? '—'}
            </span>
            <span className="text-xs text-text-secondary font-mono">
              {formatDate(p.created_at)} · {p.metodo ?? ''}
            </span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-sm font-bold text-text-primary">
              {p.monto != null
                ? new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(p.monto)
                : '—'}
            </span>
            <Badge variant={estadoPagoVariant(p.estado)}>{p.estado ?? '—'}</Badge>
          </div>
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
