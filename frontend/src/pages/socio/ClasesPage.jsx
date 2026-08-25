import { useState, useMemo } from 'react'
import { toast } from 'sonner'
import MemberLayout from '../../layouts/MemberLayout'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import FilterButton from '../../components/ui/FilterButton'
import {
  DIAS_AGENDA,
  CATEGORIAS_CLASES,
  getStoredClasses,
  saveStoredClasses,
} from '../../services/socioMockData'

export default function ClasesPage() {
  // Catálogo de clases con persistencia local simulada
  // TODO: reemplazar por API real -> GET /api/classes/
  const [classesList, setClassesList] = useState(getStoredClasses)
  
  // Filtros interactivos con fecha de hoy por defecto
  const [selectedDay, setSelectedDay] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const [selectedTurno, setSelectedTurno] = useState('todos') // 'todos' | 'manana' | 'tarde'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('catalogo') // 'catalogo' | 'mis_reservas'

  // Clases reservadas por el socio
  const myBookings = useMemo(() => {
    return classesList.filter((c) => c.isBooked)
  }, [classesList])

  // Filtrado de clases para el catálogo
  const filteredClasses = useMemo(() => {
    return classesList.filter((c) => {
      // Filtro por día
      if (c.fecha !== selectedDay) return false

      // Filtro por categoría
      if (selectedCategory !== 'todas' && c.categoria !== selectedCategory) return false

      // Filtro por turno
      if (selectedTurno !== 'todos' && c.turno !== selectedTurno) return false

      // Filtro por texto de búsqueda (nombre clase o instructor)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchName = c.nombre.toLowerCase().includes(q)
        const matchInstructor = c.instructor.toLowerCase().includes(q)
        const matchSala = c.sala.toLowerCase().includes(q)
        if (!matchName && !matchInstructor && !matchSala) return false
      }

      return true
    })
  }, [classesList, selectedDay, selectedCategory, selectedTurno, searchQuery])

  // Acción de reservar cupo
  // TODO: reemplazar por API real -> POST /api/classes/:id/book/
  const handleBookClass = (classId) => {
    setClassesList((prev) => {
      const updated = prev.map((c) => {
        if (c.id === classId) {
          if (c.cuposReservados >= c.cuposTotales) {
            toast.error('Esta clase ya no tiene cupos disponibles')
            return c
          }
          toast.success(`¡Cupo reservado para ${c.nombre}!`)
          return {
            ...c,
            isBooked: true,
            cuposReservados: c.cuposReservados + 1,
          }
        }
        return c
      })
      saveStoredClasses(updated)
      return updated
    })
  }

  // Acción de cancelar reserva
  // TODO: reemplazar por API real -> POST /api/classes/:id/cancel/
  const handleCancelBooking = (classId) => {
    setClassesList((prev) => {
      const updated = prev.map((c) => {
        if (c.id === classId) {
          toast.info(`Reserva cancelada para ${c.nombre}`)
          return {
            ...c,
            isBooked: false,
            cuposReservados: Math.max(0, c.cuposReservados - 1),
          }
        }
        return c
      })
      saveStoredClasses(updated)
      return updated
    })
  }

  // Info del día seleccionado
  const currentDayInfo = DIAS_AGENDA.find((d) => d.id === selectedDay)

  return (
    <MemberLayout
      title="Agenda y Reservas"
      subtitle="Catálogo semanal y cupos"
    >
      <div className="flex flex-col gap-3 w-full animate-fadeIn">

        {/* SELECTOR DE PESTAÑAS */}
        <div className="w-full bg-bg-surface rounded-lg p-1 flex items-center justify-between gap-1 select-none border border-subtle">
          <button
            onClick={() => setActiveTab('catalogo')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center text-xs transition-all ${
              activeTab === 'catalogo'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'text-text-secondary font-medium hover:text-text-primary'
            }`}
          >
            Todas las Clases
          </button>
          <button
            onClick={() => setActiveTab('mis_reservas')}
            className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 text-xs transition-all ${
              activeTab === 'mis_reservas'
                ? 'bg-primary text-white font-semibold shadow-sm'
                : 'text-text-secondary font-medium hover:text-text-primary'
            }`}
          >
            <span>Mis Reservas</span>
            {myBookings.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === 'mis_reservas'
                    ? 'bg-white text-primary'
                    : 'bg-primary text-white'
                }`}
              >
                {myBookings.length}
              </span>
            )}
          </button>
        </div>

        {/* VISTA 1: CATÁLOGO CON FILTROS */}
        {activeTab === 'catalogo' && (
          <>
            {/* SELECTOR HORIZONTAL DE DÍAS */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Día de la semana
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {DIAS_AGENDA.map((dia) => {
                  const isSelected = dia.id === selectedDay
                  return (
                    <FilterButton
                      key={dia.id}
                      active={isSelected}
                      onClick={() => setSelectedDay(dia.id)}
                      className="flex flex-col items-center justify-center min-w-[50px] py-1.5 px-1"
                    >
                      <span className="text-[10px] font-medium uppercase tracking-tight">
                        {dia.diaNombre}
                      </span>
                      <span className="text-sm font-bold leading-tight">
                        {dia.diaNumero}
                      </span>
                      {dia.esHoy && (
                        <span
                          className={`text-[9px] mt-0.5 font-semibold px-1 rounded ${
                            isSelected ? 'bg-white/25 text-white' : 'text-primary'
                          }`}
                        >
                          Hoy
                        </span>
                      )}
                    </FilterButton>
                  )
                })}
              </div>
            </div>

            {/* BUSCADOR Y FILTRO DE TURNO */}
            <div className="flex flex-col gap-2">
              {/* Buscador */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Buscar clase o profesor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-bg-surface border border-subtle rounded-lg pl-8 pr-7 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-primary transition-colors"
                />
                <svg
                  className="absolute left-2.5 top-2.5 text-text-tertiary"
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-2 text-text-tertiary hover:text-text-primary text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Turno */}
              <div className="flex items-center gap-1 text-[11px]">
                <span className="text-text-tertiary text-[10px]">Turno:</span>
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'manana', label: 'Mañana' },
                  { id: 'tarde', label: 'Tarde / Noche' },
                ].map((t) => (
                  <FilterButton
                    key={t.id}
                    active={selectedTurno === t.id}
                    onClick={() => setSelectedTurno(t.id)}
                    className="px-2 py-1 text-xs"
                  >
                    {t.label}
                  </FilterButton>
                ))}
              </div>
            </div>

            {/* SELECTOR DE DISCIPLINAS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIAS_CLASES.map((cat) => {
                const isSelected = selectedCategory === cat.id
                return (
                  <FilterButton
                    key={cat.id}
                    active={isSelected}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1"
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </FilterButton>
                )
              })}
            </div>

            {/* ENCABEZADO DE RESULTADOS */}
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="font-semibold text-text-primary text-xs">
                {currentDayInfo?.fechaCompleta || 'Agenda de Clases'}
              </span>
              <span className="text-text-tertiary text-[11px]">
                {filteredClasses.length} {filteredClasses.length === 1 ? 'clase' : 'clases'}
              </span>
            </div>

            {/* LISTA DE CLASES */}
            <div className="flex flex-col gap-2.5">
              {filteredClasses.length === 0 ? (
                <div className="p-6 rounded-lg bg-bg-surface border border-subtle text-center flex flex-col items-center justify-center gap-2">
                  <span className="text-2xl">🗓️</span>
                  <h4 className="text-xs font-bold text-text-primary">
                    No hay clases con estos filtros
                  </h4>
                  <p className="text-[11px] text-text-secondary">
                    Probá cambiando de disciplina o seleccionando otro día.
                  </p>
                </div>
              ) : (
                filteredClasses.map((clase) => {
                  const spotsLeft = clase.cuposTotales - clase.cuposReservados
                  const isFull = spotsLeft <= 0
                  const occupancyRatio = clase.cuposReservados / clase.cuposTotales

                  return (
                    <div
                      key={clase.id}
                      className={`rounded-lg bg-bg-surface border p-3.5 flex flex-col gap-2.5 shadow-sm transition-all ${
                        clase.isBooked
                          ? 'border-primary/60 ring-1 ring-primary/20'
                          : 'border-subtle hover:border-strong'
                      }`}
                    >
                      {/* Fila Horario y Categoría */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-text-primary font-mono">
                            {clase.horaInicio} - {clase.horaFin}
                          </span>
                          <span className="text-[11px] text-text-tertiary font-mono">
                            ({clase.duracionMin}m)
                          </span>
                        </div>

                        <Badge
                          variant={
                            clase.categoria === 'crossfit' || clase.categoria === 'boxeo'
                              ? 'danger'
                              : clase.categoria === 'spinning' || clase.categoria === 'hiit'
                              ? 'warning'
                              : 'success'
                          }
                        >
                          {clase.categoria.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Título de Clase y Sala */}
                      <div>
                        <h3 className="text-sm font-bold text-text-primary leading-snug">
                          {clase.nombre}
                        </h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {clase.sala} • Intensidad {clase.intensidad}
                        </p>
                      </div>

                      {/* Instructor y Cupos */}
                      <div className="pt-2 border-t border-subtle flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-bg-raised border border-strong flex items-center justify-center text-[10px] font-bold text-text-primary">
                            {clase.instructor.charAt(0)}
                          </div>
                          <span className="text-xs font-medium text-text-primary">
                            {clase.instructor}
                          </span>
                        </div>

                        {/* Aforo / Cupos */}
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-medium text-text-secondary">
                            {isFull ? (
                              <strong className="text-error-500">Cupo Completo</strong>
                            ) : (
                              <span>
                                <strong className="text-text-primary">{spotsLeft}</strong> libres
                              </span>
                            )}
                          </span>
                          <div className="w-16 h-1 bg-bg-raised rounded-full overflow-hidden mt-1">
                            <div
                              className={`h-full rounded-full ${
                                isFull
                                  ? 'bg-error-500'
                                  : occupancyRatio > 0.75
                                  ? 'bg-warning-500'
                                  : 'bg-success-500'
                              }`}
                              style={{ width: `${occupancyRatio * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Acción de Reserva */}
                      <div className="pt-2 border-t border-subtle flex items-center justify-between">
                        {clase.isBooked ? (
                          <>
                            <div className="flex items-center gap-1 text-xs text-success-500 font-semibold">
                              <span>✓ Reservada</span>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCancelBooking(clase.id)}
                              className="text-xs text-error-500 hover:text-error-600 hover:bg-error-500/10 border-error-500/30 py-1"
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={isFull}
                            onClick={() => handleBookClass(clase.id)}
                            className="w-full py-1.5 text-xs font-bold shadow-sm"
                          >
                            {isFull ? 'Sin cupos disponibles' : 'Reservar mi cupo'}
                          </Button>
                        )}
                      </div>

                    </div>
                  )
                })
              )}
            </div>
          </>
        )}

        {/* VISTA 2: MIS RESERVAS */}
        {activeTab === 'mis_reservas' && (
          <div className="flex flex-col gap-2.5">
            <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
              Tus reservas activas ({myBookings.length})
            </span>

            {myBookings.length === 0 ? (
              <div className="p-6 rounded-lg bg-bg-surface border border-subtle text-center flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">🎫</span>
                <h4 className="text-xs font-bold text-text-primary">
                  No tenés reservas activas
                </h4>
                <p className="text-xs text-text-secondary">
                  Explorá las actividades en el catálogo para agendar tu lugar.
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveTab('catalogo')}
                  className="mt-1"
                >
                  Ver Catálogo
                </Button>
              </div>
            ) : (
              myBookings.map((clase) => (
                <div
                  key={clase.id}
                  className="rounded-lg bg-bg-surface border border-primary/40 p-3.5 flex flex-col gap-2 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary uppercase">
                      {clase.fecha} • {clase.horaInicio}h
                    </span>
                    <Badge variant="live">Confirmada</Badge>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {clase.nombre}
                    </h3>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {clase.sala} • {clase.instructor}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-subtle flex items-center justify-between">
                    <span className="text-[10px] text-text-tertiary">
                      Cancelación permitida hasta 2h antes
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleCancelBooking(clase.id)}
                      className="text-xs text-error-500 hover:text-error-600 hover:bg-error-500/10 border-error-500/30 py-1"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </MemberLayout>
  )
}
