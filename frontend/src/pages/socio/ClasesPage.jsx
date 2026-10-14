import { useState, useMemo } from 'react'
import { Calendar } from 'lucide-react'
import { toast } from 'sonner'
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
import useAuthStore from '../../stores/authStore'
import EstadoBanner from '../../components/socio/EstadoBanner'
import { useDisciplinas } from '../../hooks/queries/useCatalogo'

const DIAS_AGENDA = generateDaysAgenda()

/** ART (America/Argentina/Buenos_Aires) aware "today" date string YYYY-MM-DD */
function getTodayART() {
  try {
    const now = new Date()
    const artStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    return artStr // en-CA gives YYYY-MM-DD format
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

/** Map a YYYY-MM-DD date string to its lowercase Spanish weekday name using ART timezone. */
function getDiaParam(dateStr) {
  // Append T12:00:00 to avoid any DST/UTC shift when parsing
  const d = new Date(`${dateStr}T12:00:00`)
  const diasMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
  return diasMap[d.getDay()]
}

/** Get discipline label from backend categoria value */
function getDisciplinaLabel(categoria) {
  const map = {
    funcional: 'Funcional',
    spinning: 'Spinning',
    crossfit: 'CrossFit',
    pilates: 'Pilates',
    yoga: 'Yoga',
    boxeo: 'Boxeo',
    hiit: 'HIIT',
  }
  return map[categoria] ?? categoria?.toUpperCase() ?? '—'
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
    disciplinaLabel: getDisciplinaLabel(c.categoria),
    instructor: c.instructor,
    instructorAvatar: '',
    horaInicio: c.hora.substring(0, 5),
    horaFin,
    duracionMin: c.duracion_min,
    sala: c.sala,
    cuposTotales: c.cupo_maximo,
    cuposReservados: c.cupos_reservados,
    listaEsperaMax: c.lista_espera_max ?? 0,
    isBooked: c.user_inscrito,
    enEspera: c.user_en_espera,
    posicionEspera: c.posicion_en_espera,
    descripcion: c.descripcion,
    cancelacion_horas: c.cancelacion_horas,
    // Reservation + class state
    estado: c.estado,
    motivo_cancelacion: c.motivo_cancelacion,
    dia: c.dia,
    proximaFecha: c.proxima_fecha ?? undefined,
  }
}

export default function ClasesPage() {
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.rol === 'administrador'
  const isActivo = !user?.estado || user.estado === 'activo'

  // Filtros interactivos con fecha de hoy ART por defecto
  const [selectedDay, setSelectedDay] = useState(getTodayART)
  const [selectedCategory, setSelectedCategory] = useState('todas')
  const [selectedTurno, setSelectedTurno] = useState('todos') // 'todos' | 'manana' | 'tarde' | 'noche'
  const [selectedSala, setSelectedSala] = useState('todas')
  const [selectedInstructor, setSelectedInstructor] = useState('todos')
  const [soloConLugar, setSoloConLugar] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('catalogo') // 'catalogo' | 'mis_reservas'

  // Build query params for catalog tab
  const catalogParams = useMemo(() => {
    const params = { dia: getDiaParam(selectedDay) }
    if (selectedCategory !== 'todas') params.categoria = selectedCategory
    if (searchQuery.trim()) params.search = searchQuery
    if (selectedTurno === 'manana') params.hora_hasta = '11:59:59'
    if (selectedTurno === 'tarde') params.hora_desde = '12:00:00'
    if (selectedTurno === 'noche') params.hora_desde = '19:00:00'
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

  // API-driven disciplinas for category filter (falls back to CATEGORIAS_CLASES if empty)
  const { data: disciplinasAPI = [] } = useDisciplinas()
  const categoriaOptions = useMemo(() => {
    if (disciplinasAPI.length > 0) {
      return [
        { id: 'todas', label: 'Todas' },
        ...disciplinasAPI
          .filter((d) => d.activa !== false)
          .map((d) => ({ id: d.slug ?? d.nombre.toLowerCase(), label: d.nombre })),
      ]
    }
    return CATEGORIAS_CLASES
  }, [disciplinasAPI])

  const isLoading = activeTab === 'catalogo' ? loadingCatalog : loadingAll

  // Derive available salas and instructors from catalog data for filter chips
  const availableSalas = useMemo(() => {
    const salas = [...new Set(rawCatalog.map((c) => c.sala).filter(Boolean))]
    return salas
  }, [rawCatalog])

  const availableInstructors = useMemo(() => {
    const instructors = [...new Set(rawCatalog.map((c) => c.instructor).filter(Boolean))]
    return instructors
  }, [rawCatalog])

  // Apply client-side extra filters (sala, instructor, soloConLugar)
  const filteredCatalog = useMemo(() => {
    return rawCatalog.filter((c) => {
      if (soloConLugar && c.cupos_reservados >= c.cupo_maximo) return false
      if (selectedSala !== 'todas' && c.sala !== selectedSala) return false
      if (selectedInstructor !== 'todos' && c.instructor !== selectedInstructor) return false
      return true
    })
  }, [rawCatalog, soloConLugar, selectedSala, selectedInstructor])

  // Map raw API data to ClassCard shape
  const filteredClasses = useMemo(
    () => (activeTab === 'catalogo' ? filteredCatalog : rawAll.filter((c) => c.user_inscrito || c.user_en_espera)).map(mapClase),
    [activeTab, filteredCatalog, rawAll]
  )

  const myBookings = useMemo(
    () => rawAll.filter((c) => c.user_inscrito || c.user_en_espera).map(mapClase),
    [rawAll]
  )

  const handleBookClass = (classId) => {
    const clase = rawCatalog.find((c) => c.id === classId)
    const isFull = clase && clase.cupos_reservados >= clase.cupo_maximo
    if (isFull && clase?.lista_espera_max > 0) {
      inscribir.mutate(classId, {
        onSuccess: (data) => {
          if (data?.en_espera) {
            toast.info(`Quedaste #${data.posicion_en_espera ?? '—'} en espera`)
          } else if (data?.promovido_de_espera) {
            toast.success('¡Fuiste promovido de la lista de espera! Tu cupo está confirmado.')
          }
        },
      })
    } else {
      inscribir.mutate(classId)
    }
  }

  const handleCancelBooking = (classId) => cancelar.mutate(classId)

  // Info del día seleccionado
  const currentDayInfo = DIAS_AGENDA.find((d) => d.id === selectedDay)

  return (
    <MemberLayout
      title="Agenda y Reservas"
      subtitle="Catálogo semanal y cupos"
    >
      <div className="flex flex-col gap-3 w-full animate-fadeIn">

        {/* Estado suspendido / baja */}
        {!isActivo && (
          <EstadoBanner estado={user.estado} motivo={user.motivo_suspension} />
        )}

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
                  { id: 'noche', label: 'Noche' },
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

              {/* Extra filters row: Solo con lugar + Sala + Instructor */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <FilterButton
                  active={soloConLugar}
                  onClick={() => setSoloConLugar((v) => !v)}
                  className="px-2 py-1 text-xs"
                >
                  Solo con lugar
                </FilterButton>
                {availableSalas.length > 1 && availableSalas.map((sala) => (
                  <FilterButton
                    key={sala}
                    active={selectedSala === sala}
                    onClick={() => setSelectedSala(selectedSala === sala ? 'todas' : sala)}
                    className="px-2 py-1 text-xs"
                  >
                    {sala}
                  </FilterButton>
                ))}
                {availableInstructors.length > 1 && availableInstructors.map((inst) => (
                  <FilterButton
                    key={inst}
                    active={selectedInstructor === inst}
                    onClick={() => setSelectedInstructor(selectedInstructor === inst ? 'todos' : inst)}
                    className="px-2 py-1 text-xs"
                  >
                    {inst}
                  </FilterButton>
                ))}
              </div>
            </div>

            {/* SELECTOR DE DISCIPLINAS */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 w-full scrollbar-none">
              {categoriaOptions.map((cat) => {
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
                    onBook={isAdmin ? undefined : handleBookClass}
                    onCancel={isAdmin ? undefined : handleCancelBooking}
                    hideBooking={isAdmin}
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
              myBookings.map((clase) => {
                const isCancelada = clase.estado === 'cancelada'
                const dayName = clase.dia
                  ? clase.dia.charAt(0).toUpperCase() + clase.dia.slice(1)
                  : undefined
                return (
                  <div key={clase.id} className="flex flex-col gap-1">
                    {/* Day + próxima fecha row */}
                    {(dayName || clase.proximaFecha) && (
                      <div className="flex items-center gap-2 px-1 text-[10px] text-text-tertiary font-semibold uppercase tracking-wide">
                        {dayName && <span>{dayName}s</span>}
                        {clase.proximaFecha && (
                          <span className="text-text-secondary normal-case">
                            · Próxima: {new Date(`${clase.proximaFecha}T12:00:00`).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    )}
                    {isCancelada ? (
                      <Card className="p-3.5 border-error-500/30 bg-error-500/5 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-error-500">Clase cancelada</span>
                          <span className="text-xs text-text-tertiary">{clase.horaInicio}h</span>
                        </div>
                        <span className="text-sm font-bold text-text-primary">{clase.nombre}</span>
                        {clase.motivo_cancelacion && (
                          <p className="text-xs text-text-secondary italic">
                            Motivo: {clase.motivo_cancelacion}
                          </p>
                        )}
                      </Card>
                    ) : (
                      <ClassCard
                        clase={clase}
                        variant="booked"
                        onBook={isAdmin ? undefined : handleBookClass}
                        onCancel={isAdmin ? undefined : handleCancelBooking}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}

      </div>
    </MemberLayout>
  )
}
