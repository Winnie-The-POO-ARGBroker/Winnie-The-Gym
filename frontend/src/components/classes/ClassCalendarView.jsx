import { Users, Clock, MapPin, Sparkles } from 'lucide-react'
import { DISCIPLINAS_CONFIG } from '../../constants/disciplinas'

const DIAS_SEMANA = [
  { key: 'Lunes', diaNum: 1, label: 'Lunes', short: 'Lun', fecha: '01 Jun' },
  { key: 'Martes', diaNum: 2, label: 'Martes', short: 'Mar', fecha: '02 Jun' },
  { key: 'Miércoles', diaNum: 3, label: 'Miércoles', short: 'Mié', fecha: '03 Jun' },
  { key: 'Jueves', diaNum: 4, label: 'Jueves', short: 'Jue', fecha: '04 Jun' },
  { key: 'Viernes', diaNum: 5, label: 'Viernes', short: 'Vie', fecha: '05 Jun' },
  { key: 'Sábado', diaNum: 6, label: 'Sábado', short: 'Sáb', fecha: '06 Jun' },
]

const HORAS_GRILLA = [
  '08:00',
  '09:00',
  '10:00',
  '11:00',
  '12:00',
]

export default function ClassCalendarView({ classes = [], onSelectClass, onOpenAttendees }) {
  // Helper to find classes for a specific day and hour slot
  const getClassesForSlot = (diaKey, horaStr) => {
    const slotHour = parseInt(horaStr.split(':')[0], 10)
    return classes.filter((cls) => {
      if (cls.dia !== diaKey && !cls.dias_recurrencia?.includes(diaKey.charAt(0))) {
        if (cls.dia !== diaKey) return false
      }
      const clsHour = parseInt((cls.hora || '08:00').split(':')[0], 10)
      return clsHour === slotHour
    })
  }

  return (
    <div className="w-full bg-bg-surface border border-subtle rounded-2xl overflow-hidden shadow-sm transition-all animate-fadeIn">
      {/* Calendar Grid Header */}
      <div className="grid grid-cols-7 border-b border-subtle bg-bg-raised/40 divide-x divide-subtle">
        <div className="p-3.5 text-center text-xs font-bold text-text-tertiary uppercase tracking-wider flex items-center justify-center">
          <Clock className="w-3.5 h-3.5 mr-1" />
          HORA
        </div>
        {DIAS_SEMANA.map((dia) => (
          <div key={dia.key} className="p-3 text-center">
            <p className="text-xs font-bold text-text-primary uppercase tracking-wide">
              {dia.label}
            </p>
            <span className="text-[11px] text-text-secondary font-medium">
              {dia.fecha}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar Grid Body */}
      <div className="divide-y divide-subtle">
        {HORAS_GRILLA.map((hora) => (
          <div key={hora} className="grid grid-cols-7 divide-x divide-subtle min-h-[110px]">
            {/* Time label */}
            <div className="p-3 text-center flex flex-col justify-start items-center bg-bg-raised/20 text-xs font-bold text-text-secondary">
              <span>{hora}</span>
              <span className="text-[10px] text-text-tertiary font-normal">hs</span>
            </div>

            {/* Day columns */}
            {DIAS_SEMANA.map((dia) => {
              const slotClasses = getClassesForSlot(dia.key, hora)

              return (
                <div
                  key={`${dia.key}-${hora}`}
                  className="p-1.5 flex flex-col gap-1.5 transition-colors hover:bg-bg-raised/10"
                >
                  {slotClasses.map((cls) => {
                    const cfg = DISCIPLINAS_CONFIG[cls.categoria] || DISCIPLINAS_CONFIG.funcional
                    const isFull = cls.cupos_reservados >= cls.cupo_maximo

                    return (
                      <div
                        key={cls.id}
                        onClick={() => onSelectClass(cls)}
                        style={{
                          borderLeftWidth: '4px',
                          borderLeftColor: cfg.border,
                          backgroundColor: 'var(--color-bg-raised)',
                        }}
                        className="group relative rounded-xl p-2.5 cursor-pointer border border-subtle hover:border-orange-500/50 shadow-sm transition-all hover:scale-[1.01]"
                      >
                        {/* Top: Tag + Full badge */}
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            style={{ color: cfg.color }}
                            className="text-[11px] font-bold tracking-tight"
                          >
                            {cls.nombre}
                          </span>
                          {isFull && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-error-500/20 text-error-500 border border-error-500/30">
                              LLENO
                            </span>
                          )}
                        </div>

                        {/* Room & Time */}
                        <p className="text-[11px] text-text-secondary flex items-center gap-1 font-medium">
                          <MapPin className="w-2.5 h-2.5 text-text-tertiary" />
                          {cls.sala} · {cls.hora}
                        </p>

                        {/* Attendees Count & Action */}
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-subtle/60 text-[11px]">
                          <span className="flex items-center gap-1 font-bold text-text-primary">
                            <Users className="w-3 h-3 text-text-tertiary" />
                            {cls.cupos_reservados}/{cls.cupo_maximo}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onOpenAttendees(cls)
                            }}
                            className="px-2 py-0.5 rounded text-[10px] font-bold text-orange-500 hover:bg-orange-500/10 transition-colors"
                          >
                            Lista
                          </button>
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
