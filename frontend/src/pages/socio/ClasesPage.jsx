import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import MemberLayout from '../../components/layout/MemberLayout'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import FilterButton from '../../components/ui/FilterButton'
import ClassCard from '../../components/socio/ClassCard'
import EmptyState from '../../components/ui/EmptyState'
import { CATEGORIAS_CLASES } from '../../constants/clases'
import { generateDaysAgenda } from '../../utils/agenda'
import { useClasesList } from '../../hooks/queries/useClases'
import { useInscripcionesMutations } from '../../hooks/queries/useInscripciones'

const DIAS_AGENDA = generateDaysAgenda()

/** Map a YYYY-MM-DD date string to its lowercase Spanish weekday name. */
function getDiaParam(dateStr) {
  const d = new Date(`${dateStr}T00:00:00`)
  const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return diasMap[d.getDay()]
}

/** Convert a raw API class object to the shape ClassCard expects. */
function mapClase(c) {
  const [h, m] = c.hora.split(':').map(Number)
  const dateObj = new Date()
  dateObj.setHours(h, m + c.duracion_min, 0)
  const horaFin = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`
  return {
    id: c.id,
    fecha: undefined,
    nombre: c.nombre,
    categoria: c.categoria,
    instructor: c.instructor,
    instructorAvatar: '',
    horaInicio: c.hora.substring(0, 5),
    horaFin,
    duracionMin: c.duracion_min,
    sala: c.sala,
    cuposTotales: c.cupo_maximo,
    cuposReservados: c.cupos_reservados,
    isBooked: c.user_inscrito,
    descripcion: c.descripcion,
  }
}

export default function ClasesPage() {
  // Filtros interactivos con fecha de hoy por defecto
  const [selectedDay, setSelectedDay] = useState(
    () => new Date().toISOString().split('T')[0]
  )
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const [selectedTurno, setSelectedTurno] = useState('todos') // 'todos' | 'manana' | 'tarde'
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('catalogo') // 'catalogo' | 'mis_reservas'

  // Build query params for catalog tab
  const catalogParams = useMemo(() => {
    const params = { dia: getDiaParam(selectedDay) }
    if (selectedCategory !== 'todas') params.categoria = selectedCategory
    if (searchQuery.trim()) params.search = searchQuery
    if (selectedTurno === 'manana') params.hora_hasta = '11:59:59'
    if (selectedTurno === 'tarde') params.hora_desde = '12:00:00'
    return params
  }, [selectedDay, selectedCategory, searchQuery, selectedTurno])

  // Catalog query — only active when catalog tab is shown
  const { data: rawCatalog = [], isFetching: loadingCatalog } = useClasesList(catalogParams, {
    enabled: activeTab === 'catalogo',
  })

  // All-classes query for mis_reservas — only active on that tab
  const { data: rawAll = [], isFetching: loadingAll } = useClasesList({}, {
    enabled: activeTab === 'mis_reservas',
  })

  const { inscribir, cancelar } = useInscripcionesMutations()

  const isLoading = activeTab === 'catalogo' ? loadingCatalog : loadingAll

  // Map raw API data to ClassCard shape
  const filteredClasses = useMemo(
    () => (activeTab === 'catalogo' ? rawCatalog : rawAll.filter((c) => c.user_inscrito)).map(mapClase),
    [activeTab, rawCatalog, rawAll]
  )

  const myBookings = useMemo(
    () => rawAll.filter((c) => c.user_inscrito).map(mapClase),
    [rawAll]
  )

  const handleBookClass = (classId) => inscribir.mutate(classId)
  const handleCancelBooking = (classId) => cancelar.mutate(classId)

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
          <FilterButton
            active={activeTab === 'catalogo'}
            onClick={() => setActiveTab('catalogo')}
            className="flex-1 py-1.5 rounded-md flex items-center justify-center text-xs"
          >
            Todas las Clases
          </FilterButton>
          <FilterButton
            active={activeTab === 'mis_reservas'}
            onClick={() => setActiveTab('mis_reservas')}
            className="flex-1 py-1.5 rounded-md flex items-center justify-center gap-1.5 text-xs"
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
          </FilterButton>
        </div>

        {/* VISTA 1: CATÁLOGO CON FILTROS */}
        {activeTab === 'catalogo' && (
          <>
            {/* SELECTOR HORIZONTAL DE DÍAS */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">
                Día de la semana
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-2 w-full scrollbar-none">
                {DIAS_AGENDA.map((dia) => {
                  const isSelected = dia.id === selectedDay
                  return (
                    <FilterButton
                      key={dia.id}
                      active={isSelected}
                      onClick={() => setSelectedDay(dia.id)}
                      className="flex flex-col items-center justify-center min-w-[50px] py-1.5 px-1 flex-shrink-0"
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
                    aria-label="Limpiar búsqueda"
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
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 w-full scrollbar-none">
              {CATEGORIAS_CLASES.map((cat) => {
                const isSelected = selectedCategory === cat.id
                return (
                  <FilterButton
                    key={cat.id}
                    active={isSelected}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 flex items-center gap-1"
                  >
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
              {isLoading ? (
                <EmptyState
                  icon={Calendar}
                  title="Cargando clases..."
                  message="Por favor esperá unos segundos."
                />
              ) : filteredClasses.length === 0 && !searchQuery && selectedCategory === 'todas' ? (
                <EmptyState
                  icon={Calendar}
                  title="No hay clases programadas"
                  message="Consultá con recepción para ver la agenda."
                />
              ) : filteredClasses.length === 0 ? (
                <Card className="p-6 text-center flex flex-col items-center justify-center gap-2">
                  <h4 className="text-xs font-bold text-text-primary">
                    No hay clases con estos filtros
                  </h4>
                  <p className="text-[11px] text-text-secondary">
                    Probá cambiando de disciplina o seleccionando otro día.
                  </p>
                </Card>
              ) : (
                filteredClasses.map((clase) => (
                  <ClassCard
                    key={clase.id}
                    clase={clase}
                    variant="catalog"
                    onBook={handleBookClass}
                    onCancel={handleCancelBooking}
                  />
                ))
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

            {isLoading ? (
                <EmptyState
                  icon={Calendar}
                  title="Cargando reservas..."
                  message="Por favor esperá unos segundos."
                />
            ) : myBookings.length === 0 ? (
              <Card className="p-6 text-center flex flex-col items-center justify-center gap-2">
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
              </Card>
            ) : (
              myBookings.map((clase) => (
                <ClassCard
                  key={clase.id}
                  clase={clase}
                  variant="booked"
                  onBook={handleBookClass}
                  onCancel={handleCancelBooking}
                />
              ))
            )}
          </div>
        )}

      </div>
    </MemberLayout>
  )
}
