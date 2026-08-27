import React, { useState } from 'react'
import {
  Users,
  Clock,
  MapPin,
  User,
  Calendar,
  CheckCircle2,
  Edit2,
  Trash2,
  Sparkles,
  ShieldAlert,
} from 'lucide-react'
import { DISCIPLINAS_CONFIG } from '../../constants/disciplinas'

const CATEGORIAS_FILTRO = [
  { key: 'todas', label: 'Todas' },
  { key: 'funcional', label: 'Funcional' },
  { key: 'spinning', label: 'Spinning' },
  { key: 'crossfit', label: 'Crossfit' },
  { key: 'yoga', label: 'Yoga' },
  { key: 'pilates', label: 'Pilates' },
]

export default function ClassListDetailView({
  classes = [],
  selectedClass = null,
  onSelectClass,
  onOpenAttendees,
  onEditClass,
  onDeleteClass,
}) {
  const [activeCategory, setActiveCategory] = useState('todas')

  const filteredClasses = classes.filter((cls) => {
    if (activeCategory === 'todas') return true
    return cls.categoria?.toLowerCase() === activeCategory
  })

  // Current selected class object
  const current = selectedClass || filteredClasses[0] || classes[0]

  const currentCfg = current
    ? DISCIPLINAS_CONFIG[current.categoria] || DISCIPLINAS_CONFIG.funcional
    : DISCIPLINAS_CONFIG.funcional

  const occupancyPct = current
    ? Math.min(100, Math.round(((current.cupos_reservados || 0) / (current.cupo_maximo || 20)) * 100))
    : 0

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 transition-all animate-fadeIn">
      {/* LEFT PANEL: FILTERS & CLASS LIST (5 cols on lg) */}
      <div className="lg:col-span-5 flex flex-col gap-4">
        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIAS_FILTRO.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === cat.key
                  ? 'bg-orange-500 text-white shadow-sm font-bold'
                  : 'bg-bg-surface border border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-raised'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Classes List */}
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[650px] pr-1">
          {filteredClasses.length === 0 ? (
            <div className="p-8 text-center bg-bg-surface border border-subtle rounded-2xl text-text-secondary text-xs">
              No hay clases registradas en esta disciplina.
            </div>
          ) : (
            filteredClasses.map((cls) => {
              const isSelected = current?.id === cls.id
              const cfg = DISCIPLINAS_CONFIG[cls.categoria] || DISCIPLINAS_CONFIG.funcional
              const isFull = cls.cupos_reservados >= cls.cupo_maximo

              return (
                <div
                  key={cls.id}
                  onClick={() => onSelectClass(cls)}
                  className={`p-4 rounded-2xl cursor-pointer border transition-all ${
                    isSelected
                      ? 'bg-bg-surface border-2 border-orange-500 shadow-md ring-1 ring-orange-500/20'
                      : 'bg-bg-surface border-subtle hover:border-strong hover:bg-bg-raised/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        style={{
                          backgroundColor: cfg.bgLight,
                          color: cfg.color,
                          borderColor: `${cfg.color}40`,
                        }}
                        className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                      >
                        {cfg.label}
                      </span>
                      <span className="text-xs font-medium text-text-secondary">
                        {cls.dia} · {cls.hora}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-lg text-xs font-bold ${
                        isFull
                          ? 'bg-red-500/10 text-red-500 border border-red-500/30'
                          : 'bg-bg-raised text-text-primary border border-subtle'
                      }`}
                    >
                      {cls.cupos_reservados}/{cls.cupo_maximo}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-text-primary tracking-tight">
                    {cls.nombre}
                  </h4>

                  <div className="flex items-center gap-4 mt-2 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-text-tertiary" />
                      {cls.sala}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3 text-text-tertiary" />
                      {cls.instructor}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-tertiary" />
                      {cls.duracion_min} min
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: SELECTED CLASS DETAIL (7 cols on lg) */}
      <div className="lg:col-span-7">
        {current ? (
          <div className="bg-bg-surface border border-subtle rounded-2xl p-6 lg:p-8 flex flex-col justify-between gap-6 shadow-sm transition-all sticky top-4">
            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span
                    style={{
                      backgroundColor: currentCfg.bgLight,
                      color: currentCfg.color,
                      borderColor: `${currentCfg.color}40`,
                    }}
                    className="px-3 py-1 rounded-full text-xs font-bold border"
                  >
                    {currentCfg.label}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Activa
                  </span>
                </div>

                <span className="text-xs font-semibold text-text-secondary bg-bg-raised px-3 py-1 rounded-xl border border-subtle">
                  ID: {current.id}
                </span>
              </div>

              <h2 className="text-2xl font-extrabold text-text-primary tracking-tight">
                {current.nombre}
              </h2>
              <p className="text-xs md:text-sm text-text-secondary mt-1.5">
                {current.descripcion || 'Entrenamiento grupal de alto rendimiento y acondicionamiento.'}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 bg-bg-raised/50 p-4 rounded-xl border border-subtle text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                  SALA
                </span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {current.sala}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                  INSTRUCTOR
                </span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {current.instructor}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                  DURACIÓN
                </span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {current.duracion_min} min ({current.hora} - {current.hora_fin})
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                  CUPO MÁXIMO
                </span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {current.cupo_maximo} personas
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                  RECURRENCIA
                </span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {current.recurrencia || 'Semanal'}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-text-tertiary block">
                  CANCELACIÓN
                </span>
                <span className="font-semibold text-text-primary mt-0.5 block">
                  {current.cancelacion_horas}h antes sin cargo
                </span>
              </div>
            </div>

            {/* Occupancy & Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-text-primary flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-orange-500" />
                  Reservados: {current.cupos_reservados} / {current.cupo_maximo}
                </span>
                <span className="font-bold text-text-secondary">{occupancyPct}% ocupación</span>
              </div>

              <div className="w-full h-3 rounded-full bg-bg-raised overflow-hidden border border-subtle p-0.5">
                <div
                  style={{ width: `${occupancyPct}%` }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    occupancyPct >= 100
                      ? 'bg-red-500'
                      : occupancyPct >= 75
                      ? 'bg-orange-500'
                      : 'bg-primary'
                  }`}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1">
                <span>
                  Disponibles:{' '}
                  <strong className="text-text-primary">
                    {Math.max(0, current.cupo_maximo - current.cupos_reservados)} lugares
                  </strong>
                </span>
                <span>Lista de espera: {current.lista_espera_max || 5} cupos</span>
              </div>
            </div>

            {/* Planes Habilitados */}
            <div>
              <span className="text-[11px] uppercase font-bold text-text-tertiary block mb-2">
                Planes habilitados para reservar
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {current.planes_habilitados?.map((planNombre) => (
                  <span
                    key={planNombre}
                    className={`px-3 py-1 rounded-xl text-xs font-bold border ${
                      planNombre === 'Premium'
                        ? 'bg-orange-500/10 text-orange-500 border-orange-500/30'
                        : planNombre === 'Gold'
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30'
                        : 'bg-bg-raised text-text-secondary border-subtle'
                    }`}
                  >
                    {planNombre}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-subtle">
              <button
                onClick={() => onOpenAttendees(current)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.01]"
              >
                <Users className="w-4 h-4" />
                Ver lista de inscriptos
              </button>

              <button
                onClick={() => onEditClass(current)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-bg-raised hover:bg-bg-surface border border-subtle text-text-primary text-xs font-semibold transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5 text-text-secondary" />
                Editar
              </button>

              <button
                onClick={() => onDeleteClass(current)}
                className="flex items-center justify-center p-2.5 rounded-xl bg-bg-raised hover:bg-red-500/10 text-text-tertiary hover:text-red-500 border border-subtle transition-colors"
                title="Eliminar clase"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-bg-surface border border-subtle rounded-2xl text-text-secondary text-sm">
            Seleccioná una clase de la lista para ver su detalle y gestionar inscripciones.
          </div>
        )}
      </div>
    </div>
  )
}
