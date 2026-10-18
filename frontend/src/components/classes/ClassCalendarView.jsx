import { useState } from 'react'
import { Users, Clock, MapPin, ChevronLeft, ChevronRight, XCircle } from 'lucide-react'
import { DISCIPLINAS_CONFIG } from '../../constants/disciplinas'

// Dates are passed in as diasSemana prop

const HORAS_GRILLA = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
]

const DIAS_LETRA = {
  Lunes: 'L',
  Martes: 'M',
  Miércoles: 'X',
  Jueves: 'J',
  Viernes: 'V',
  Sábado: 'S',
  Domingo: 'D',
}

const sinTildes = (texto) => texto?.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Whether a calendar item belongs to a day column. A session carries the real
 * date; a bare class falls back to its weekday / recurrence.
 */
function ocurreEnDia(cls, dia) {
  if (cls.fecha && dia.isoDate) return cls.fecha === dia.isoDate

  if (cls.dias_recurrencia && cls.dias_recurrencia.length > 0) {
    return cls.dias_recurrencia.includes(DIAS_LETRA[dia.key])
  }
  return sinTildes(cls.dia) === sinTildes(dia.key)
}

/**
 * AgendaView — mobile-first daily class list.
 * Shows classes for one selected day with prev/next navigation.
 */
function AgendaView({ classes, diasSemana, onSelectClass, onOpenAttendees }) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectedDia = diasSemana[selectedIndex]

  const dayClasses = classes
    .filter((cls) => selectedDia && ocurreEnDia(cls, selectedDia))
    .sort((a, b) => (a.hora || '00:00').localeCompare(b.hora || '00:00'))

  return (
    <div className="w-full bg-bg-surface border border-subtle rounded-2xl overflow-hidden shadow-sm animate-fadeIn">
      {/* Day selector */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-subtle bg-bg-raised/40">
        <button
          onClick={() => setSelectedIndex((i) => Math.max(0, i - 1))}
          disabled={selectedIndex === 0}
          className="p-2 rounded-lg disabled:opacity-30 hover:bg-bg-raised transition-colors text-text-secondary"
          aria-label="Previous day"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="text-center">
          <p className="text-sm font-bold text-text-primary uppercase tracking-wide">
            {selectedDia?.label}
          </p>
          {selectedDia?.fecha && (
            <span className="text-xs text-text-secondary">{selectedDia.fecha}</span>
          )}
        </div>

        <button
          onClick={() => setSelectedIndex((i) => Math.min(diasSemana.length - 1, i + 1))}
          disabled={selectedIndex === diasSemana.length - 1}
          className="p-2 rounded-lg disabled:opacity-30 hover:bg-bg-raised transition-colors text-text-secondary"
          aria-label="Next day"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Class list */}
      <div className="divide-y divide-subtle">
        {dayClasses.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-text-tertiary">
            <Clock className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-sm">No hay clases este día</p>
          </div>
        )}

        {dayClasses.map((cls) => {
          const cfg = DISCIPLINAS_CONFIG[cls.categoria] || DISCIPLINAS_CONFIG.funcional
          const isFull = cls.cupos_reservados >= cls.cupo_maximo

          return (
            <div
              key={cls.sesion_id ?? cls.id}
              onClick={() => onSelectClass(cls)}
              style={{ borderLeftWidth: '4px', borderLeftColor: cfg.border }}
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-bg-raised/30 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span style={{ color: cfg.color }} className="text-sm font-bold truncate">
                    {cls.nombre}
                  </span>
                  {isFull && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-error-500/20 text-error-500 border border-error-500/30 flex-shrink-0">
                      LLENO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {cls.hora}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {cls.sala}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {cls.cupos_reservados}/{cls.cupo_maximo}
                  </span>
                </div>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenAttendees(cls)
                }}
                className="ml-3 px-3 py-1.5 rounded-lg text-xs font-bold text-orange-500 hover:bg-orange-500/10 transition-colors flex-shrink-0"
              >
                Lista
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * ClassCalendarView — week grid (≥ md) with agenda view fallback for mobile.
 *
 * @param {'grid'|'agenda'} [view='grid']   — force a specific view (used in tests / parent override)
 */
export default function ClassCalendarView({
  classes = [],
  diasSemana = [],
  onSelectClass,
  onOpenAttendees,
  view,
}) {
  // Helper to find classes for a specific day and hour slot
  const getClassesForSlot = (diaSemana, horaStr) => {
    const slotHour = parseInt(horaStr.split(':')[0], 10)
    return classes.filter((cls) => {
      if (!ocurreEnDia(cls, diaSemana)) return false

      const clsHour = parseInt((cls.hora || '08:00').split(':')[0], 10)
      return clsHour === slotHour
    })
  }

  // Forced view prop (used in tests); otherwise agenda is rendered via CSS
  if (view === 'agenda') {
    return (
      <AgendaView
        classes={classes}
        diasSemana={diasSemana}
        onSelectClass={onSelectClass}
        onOpenAttendees={onOpenAttendees}
      />
    )
  }

  if (view === 'grid') {
    return <WeekGrid diasSemana={diasSemana} onSelectClass={onSelectClass} onOpenAttendees={onOpenAttendees} getClassesForSlot={getClassesForSlot} />
  }

  // Responsive: agenda on mobile (<md), grid on ≥ md
  return (
    <>
      {/* Agenda view — visible on mobile only */}
      <div className="block md:hidden">
        <AgendaView
          classes={classes}
          diasSemana={diasSemana}
          onSelectClass={onSelectClass}
          onOpenAttendees={onOpenAttendees}
        />
      </div>

      {/* Week grid view — visible on md+ */}
      <div className="hidden md:block">
        <WeekGrid
          diasSemana={diasSemana}
          onSelectClass={onSelectClass}
          onOpenAttendees={onOpenAttendees}
          getClassesForSlot={getClassesForSlot}
        />
      </div>
    </>
  )
}

/** Normalize "8:00" or "08:00:00" to "HH:MM" */
function normalizeHora(hora) {
  if (!hora) return '00:00'
  const parts = hora.split(':')
  const hh = String(parseInt(parts[0], 10)).padStart(2, '0')
  const mm = String(parseInt(parts[1] ?? '0', 10)).padStart(2, '0')
  return `${hh}:${mm}`
}

function WeekGrid({ diasSemana, onSelectClass, onOpenAttendees, getClassesForSlot }) {
  return (
    <div className="w-full bg-bg-surface border border-subtle rounded-2xl overflow-hidden shadow-sm transition-all animate-fadeIn">
      {/* Calendar Grid Header */}
      <div
        className="border-b border-subtle bg-bg-raised/40 divide-x divide-subtle"
        style={{ display: 'grid', gridTemplateColumns: `80px repeat(${diasSemana.length}, 1fr)` }}
      >
        <div className="p-3.5 text-center text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 mr-1" />
          HORA
        </div>
        {diasSemana.map((dia) => (
          <div key={dia.key} className="p-3 text-center">
            <p className="text-xs font-bold text-text-primary uppercase tracking-wide">
              {dia.label}
            </p>
            <span className="text-[11px] text-text-secondary font-medium">{dia.fecha}</span>
          </div>
        ))}
      </div>

      {/* Calendar Grid Body */}
      <div className="divide-y divide-subtle">
        {HORAS_GRILLA.map((hora) => (
          <div
            key={hora}
            className="divide-x divide-subtle min-h-[110px]"
            style={{ display: 'grid', gridTemplateColumns: `80px repeat(${diasSemana.length}, 1fr)` }}
          >
            {/* Time label */}
            <div className="p-3 text-center flex flex-col justify-start items-center bg-bg-raised/20 text-xs font-bold text-text-secondary">
              <span>{hora}</span>
              <span className="text-[10px] text-text-tertiary font-normal">hs</span>
            </div>

            {/* Day columns */}
            {diasSemana.map((dia) => {
              const slotClasses = getClassesForSlot(dia, hora)

              return (
                <div
                  key={`${dia.key}-${hora}`}
                  className="relative p-1.5 flex flex-col gap-1.5 transition-colors hover:bg-bg-raised/10"
                >
                  {slotClasses.map((cls) => {
                    const cfg = DISCIPLINAS_CONFIG[cls.categoria] || DISCIPLINAS_CONFIG.funcional
                    const isFull = cls.cupos_reservados >= cls.cupo_maximo
                    const isCancelada = cls.estado === 'cancelada'
                    const horaDisplay = normalizeHora(cls.hora)

                    return (
                      <div
                        key={cls.sesion_id ?? cls.id}
                        onClick={() => onSelectClass(cls)}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: cfg.border,
                          backgroundColor: 'var(--color-bg-raised)',
                          opacity: isCancelada ? 0.6 : 1,
                        }}
                        className="group relative rounded-xl p-2.5 cursor-pointer border border-subtle hover:border-orange-500/50 shadow-sm transition-all hover:scale-[1.01]"
                      >
                        {/* Top: Tag + Full/Cancelada badge */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            style={{ color: cfg.color }}
                            className="text-[11px] font-bold tracking-tight"
                          >
                            {cls.nombre}
                          </span>
                          {isCancelada ? (
                            <span className="px-1.5 rounded text-[9px] font-extrabold bg-error-500/20 text-error-500 border border-error-500/30 flex items-center gap-0.5">
                              <XCircle className="w-2.5 h-2.5" />
                              CANCEL.
                            </span>
                          ) : isFull ? (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-error-500/20 text-error-500 border border-error-500/30">
                              LLENO
                            </span>
                          ) : null}
                        </div>

                        {/* Room & Time */}
                        <p className="text-[11px] text-text-secondary flex items-center gap-1 font-medium">
                          <MapPin className="w-2.5 h-2.5 text-text-tertiary" />
                          {cls.sala} · {horaDisplay}
                        </p>

                        {/* Attendees Count & Action */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-subtle/60 text-[11px]">
                          <span className="flex items-center gap-1 font-bold text-text-primary">
                            <Users className="w-3 h-3 text-text-tertiary" />
                            {cls.cupos_reservados}/{cls.cupo_maximo}
                          </span>
                          {!isCancelada && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onOpenAttendees(cls)
                              }}
                              className="px-2 py-0.5 rounded text-[10px] font-bold text-orange-500 hover:bg-orange-500/10 transition-colors"
                            >
                              Lista
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
