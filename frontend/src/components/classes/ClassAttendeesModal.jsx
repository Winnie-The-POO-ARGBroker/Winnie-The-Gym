import React, { useState } from 'react'
import {
  X,
  Search,
  Check,
  X as XIcon,
  Users,
  ExternalLink,
  Save,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../ui/Avatar'

export default function ClassAttendeesModal({
  isOpen,
  onClose,
  selectedClass,
  attendees = [],
  onToggleStatus,
  onSave,
}) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen || !selectedClass) return null

  const filteredAttendees = attendees.filter((att) => {
    const q = searchQuery.toLowerCase()
    return (
      att.nombre?.toLowerCase().includes(q) ||
      att.dni?.includes(q) ||
      att.socio_id?.toLowerCase().includes(q)
    )
  })

  const presentesCount = attendees.filter((a) => a.estado === 'presente').length
  const ausentesCount = attendees.filter((a) => a.estado === 'ausente').length
  const sinMarcarCount = attendees.filter(
    (a) => a.estado === 'sin_marcar' || !a.estado
  ).length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-bg-surface border border-subtle w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-bg-raised/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary">
                Inscriptos: {selectedClass.nombre}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                {attendees.length} / {selectedClass.cupo_maximo || 20}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              {selectedClass.dia} · {selectedClass.hora} ({selectedClass.duracion_min || 45} min) · {selectedClass.sala} · Prof. {selectedClass.instructor}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-tertiary hover:text-text-primary hover:bg-bg-raised transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls & Badges */}
        <div className="p-4 sm:px-6 bg-bg-surface border-b border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              placeholder="Buscar por nombre o DNI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-bg-raised border border-subtle text-xs text-text-primary focus:outline-none focus:border-orange-500 transition-colors"
            />
          </div>

          {/* Stats summary badges */}
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-1 rounded-lg font-bold bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
              <Check className="w-3 h-3 stroke-[3]" /> {presentesCount} presentes
            </span>
            <span className="px-2.5 py-1 rounded-lg font-bold bg-red-500/10 text-red-500 border border-red-500/20 flex items-center gap-1">
              <XIcon className="w-3 h-3 stroke-[3]" /> {ausentesCount} ausentes
            </span>
            <span className="px-2.5 py-1 rounded-lg font-medium bg-bg-raised text-text-secondary border border-subtle">
              {sinMarcarCount} sin marcar
            </span>
          </div>
        </div>

        {/* Attendees List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-subtle space-y-2">
          {filteredAttendees.length === 0 ? (
            <div className="py-12 text-center text-text-secondary text-xs">
              No se encontraron socios inscriptos para los criterios de búsqueda.
            </div>
          ) : (
            filteredAttendees.map((att) => {
              const isPresente = att.estado === 'presente'
              const isAusente = att.estado === 'ausente'

              return (
                <div
                  key={att.id}
                  className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl transition-colors ${
                    isPresente
                      ? 'bg-green-500/5 border border-green-500/20'
                      : isAusente
                      ? 'bg-red-500/5 border border-red-500/20'
                      : 'hover:bg-bg-raised/40'
                  }`}
                >
                  {/* Member Info */}
                  <div className="flex items-center gap-3">
                    <Avatar name={att.nombre} size={36} />
                    <div>
                      <h4 className="text-sm font-bold text-text-primary">
                        {att.nombre}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                        <span>DNI: {att.dni || '—'}</span>
                        <span>·</span>
                        <span className="text-text-tertiary">Reserva: {att.hora_reserva}</span>
                      </div>
                    </div>
                  </div>

                  {/* Plan & Attendance Toggles */}
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                        att.plan === 'Premium'
                          ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                          : att.plan === 'Gold'
                          ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                          : 'bg-bg-raised text-text-secondary border-subtle'
                      }`}
                    >
                      {att.plan}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onToggleStatus(att.id, 'presente')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isPresente
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'bg-bg-raised border border-subtle text-text-secondary hover:text-text-primary hover:bg-green-500/20'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        Presente
                      </button>

                      <button
                        onClick={() => onToggleStatus(att.id, 'ausente')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isAusente
                            ? 'bg-red-500 text-white shadow-sm'
                            : 'bg-bg-raised border border-subtle text-text-secondary hover:text-text-primary hover:bg-red-500/20'
                        }`}
                      >
                        <XIcon className="w-3.5 h-3.5 stroke-[3]" />
                        Ausente
                      </button>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-subtle bg-bg-raised/40">
          <button
            onClick={() => {
              onClose()
              navigate(`/clases/asistencia?id=${selectedClass.id}`)
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-orange-500 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir terminal completa de asistencia
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar asistencia
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
