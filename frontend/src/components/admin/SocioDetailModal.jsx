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
} from 'lucide-react'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import Button from '../ui/Button'

export default function SocioDetailModal({
  isOpen,
  onClose,
  socio,
  onEditar,
}) {
  if (!isOpen || !socio) return null

  const est = (socio.estado || '').toLowerCase()
  const tieneCertificado = !!socio.certificado_medico_url

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-bg-surface border border-subtle rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150 my-8">
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
                {est === 'activo' && <Badge variant="success">Activo</Badge>}
                {est === 'suspendido' && <Badge variant="warning">Suspendido</Badge>}
                {est === 'baja' && <Badge variant="danger">Baja</Badge>}
              </div>
              <p className="text-xs text-text-secondary">
                Socio Nº {socio.numero_socio || socio.id}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body content */}
        <div className="py-4 flex flex-col gap-4">
          {/* Fila de Datos Básicos */}
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

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1">
              <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-500" /> Fecha de Alta
              </span>
              <span className="text-sm text-text-primary">
                {socio.created_at
                  ? new Date(socio.created_at).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1">
              <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-rose-500" /> Fecha de Baja
              </span>
              <span className="text-sm text-text-primary">
                {socio.fecha_baja
                  ? new Date(socio.fecha_baja).toLocaleDateString('es-AR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'No aplica'}
              </span>
            </div>
          </div>

          {/* Certificado Médico (RF08) */}
          <div className="p-3.5 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-2">
            <span className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">
              Certificado Médico (Apto Físico)
            </span>
            {tieneCertificado ? (
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
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
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-medium">
                <FileX className="w-4 h-4" />
                <span>No posee certificado médico cargado en el sistema</span>
              </div>
            )}
          </div>

          {/* Observaciones */}
          <div className="p-3.5 rounded-xl bg-bg-raised border border-subtle flex flex-col gap-1.5">
            <span className="text-[11px] font-medium text-text-secondary flex items-center gap-1.5 uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5 text-text-secondary" /> Observaciones y Salud
            </span>
            <p className="text-xs text-text-primary whitespace-pre-wrap leading-relaxed">
              {socio.observaciones || 'Sin observaciones registradas.'}
            </p>
          </div>
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
      </div>
    </div>
  )
}
