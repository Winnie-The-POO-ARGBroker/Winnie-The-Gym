import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../components/layout/AppLayout'
import TopBar from '../components/layout/TopBar'
import ClassCalendarView from '../components/classes/ClassCalendarView'
import ClassListDetailView from '../components/classes/ClassListDetailView'
import ClassAttendeesModal from '../components/classes/ClassAttendeesModal'
import CancelarClaseModal from '../components/classes/CancelarClaseModal'
import CancelarSesionModal from '../components/classes/CancelarSesionModal'
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { useClasesList, useClasesMutations } from '../hooks/queries/useClases'
import { useClassAttendees } from '../hooks/queries/useClassAttendees'
import { useSesionesByRange, useSesionesMutations } from '../hooks/queries/useSesiones'

/** Format a Date to YYYY-MM-DD in local time (avoids UTC shift). */
function toDateStr(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function ClassSchedulePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('calendario') // 'calendario' | 'lista'
  const [selectedClass, setSelectedClass] = useState(null)
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false)
  const [classForModal, setClassForModal] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [cancelarModalOpen, setCancelarModalOpen] = useState(false)
  const [claseParaCancelar, setClaseParaCancelar] = useState(null)
  const [cancelarSesionModalOpen, setCancelarSesionModalOpen] = useState(false)
  const [sesionParaCancelar, setSesionParaCancelar] = useState(null)
  const [showCanceladas, setShowCanceladas] = useState(false)

  // ── Week date range derived from weekOffset ────────────────────────────────
  const { diasSemana, weekLabel, fechaDesde, fechaHasta } = useMemo(() => {
    const today = new Date()
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay() // Mon=1, Sun=7
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + 1 + weekOffset * 7)

    const calculatedDiasSemana = [
      { key: 'Lunes', diaNum: 1, label: 'Lunes', short: 'Lun' },
      { key: 'Martes', diaNum: 2, label: 'Martes', short: 'Mar' },
      { key: 'Miércoles', diaNum: 3, label: 'Miércoles', short: 'Mié' },
      { key: 'Jueves', diaNum: 4, label: 'Jueves', short: 'Jue' },
      { key: 'Viernes', diaNum: 5, label: 'Viernes', short: 'Vie' },
      { key: 'Sábado', diaNum: 6, label: 'Sábado', short: 'Sáb' },
      { key: 'Domingo', diaNum: 7, label: 'Domingo', short: 'Dom' },
    ].map((d, index) => {
      const dDate = new Date(monday)
      dDate.setDate(monday.getDate() + index)
      const options = { day: '2-digit', month: 'short' }
      let fechaStr = dDate.toLocaleDateString('es-ES', options).replace('.', '')
      fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)
      return { ...d, fecha: fechaStr, isoDate: toDateStr(dDate) }
    })

    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    const startDay = monday.getDate()
    const endDay = sunday.getDate()
    const monthName = sunday.toLocaleDateString('es-ES', { month: 'long' })
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    const calculatedWeekLabel = `Semana del ${startDay} al ${endDay} de ${capitalizedMonth}`

    return {
      diasSemana: calculatedDiasSemana,
      weekLabel: calculatedWeekLabel,
      fechaDesde: toDateStr(monday),
      fechaHasta: toDateStr(sunday),
    }
  }, [weekOffset])

  // ── Sesiones by real date range (primary data source for calendar) ───────────
  const { data: sesiones = [], isLoading: isLoadingSesiones } = useSesionesByRange(
    { fechaDesde, fechaHasta },
    { enabled: activeTab === 'calendario' }
  )
  const { cancelarSesion } = useSesionesMutations()

  // Fallback: still fetch all clases for the lista tab and other consumers
  const { data: allClasses = [], isLoading: isLoadingClases } = useClasesList()
  const { cancelar: cancelarClase } = useClasesMutations()

  const isLoading = activeTab === 'calendario' ? isLoadingSesiones : isLoadingClases

  // Filter canceladas unless toggle is on
  const classes = showCanceladas ? allClasses : allClasses.filter((c) => c.estado !== 'cancelada')

  // Sesiones filtered for calendar (no canceladas unless toggle)
  const sesionesFiltered = showCanceladas
    ? sesiones
    : sesiones.filter((s) => s.estado !== 'cancelada')

  const {
    attendees,
    toggleStatus,
    saveAttendees,
  } = useClassAttendees(classForModal?.id)

  const handleOpenAttendees = (cls) => {
    setClassForModal(cls)
    setIsAttendeesModalOpen(true)
  }

  const handleSelectClass = (cls) => {
    setSelectedClass(cls)
  }

  const handleEditClass = (cls) => {
    navigate(`/admin/clases/crear?id=${cls.id}`)
  }

  const handleDeleteClass = (cls) => {
    // Open soft-cancel modal instead of hard-deleting
    setClaseParaCancelar(cls)
    setCancelarModalOpen(true)
  }

  const handleCancelarSesion = (sesion) => {
    setSesionParaCancelar(sesion)
    setCancelarSesionModalOpen(true)
  }

  const handleConfirmCancelarSesion = ({ scope, motivo }) => {
    cancelarSesion.mutate(
      { id: sesionParaCancelar.id, motivo, scope },
      {
        onSuccess: () => {
          setCancelarSesionModalOpen(false)
          setSesionParaCancelar(null)
        },
      }
    )
  }

  const handleConfirmCancelar = (motivo) => {
    cancelarClase.mutate(
      { id: claseParaCancelar.id, motivo },
      {
        onSuccess: () => {
          if (selectedClass?.id === claseParaCancelar.id) setSelectedClass(null)
          setCancelarModalOpen(false)
          setClaseParaCancelar(null)
        },
        onError: () => {
          // toast handled inside useClasesMutations
        },
      },
    )
  }

  return (
    <AppLayout>
      <TopBar
        title={activeTab === 'calendario' ? 'Calendario de clases' : 'Gestión de Clases'}
        subtitle={
          activeTab === 'calendario'
            ? `${sesionesFiltered.length} sesiones · ${weekLabel}`
            : `${classes.length} clases programadas · ${weekLabel}`
        }
        rightContent={
          <>
            {activeTab === 'calendario' && (
              <div className="flex items-center gap-1 bg-bg-surface border border-subtle rounded-xl p-1">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ant.</span>
                </button>
                {weekOffset !== 0 && (
                  <button
                    onClick={() => setWeekOffset(0)}
                    className="px-2 py-1 rounded-lg text-xs font-semibold text-orange-500 hover:bg-orange-500/10 transition-colors"
                  >
                    Hoy
                  </button>
                )}
                <span className="px-2 text-xs font-bold text-text-primary hidden sm:inline">
                  {weekOffset === 0 ? 'Esta semana' : weekOffset > 0 ? `+${weekOffset} sem` : `${weekOffset} sem`}
                </span>
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                >
                  <span className="hidden sm:inline">Sig.</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={() => setShowCanceladas((v) => !v)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                showCanceladas
                  ? 'bg-error-500/10 border-error-500/40 text-error-500'
                  : 'bg-bg-surface border-subtle text-text-secondary hover:text-text-primary hover:bg-bg-raised'
              }`}
            >
              {showCanceladas ? 'Ocultar canceladas' : 'Ver canceladas'}
            </button>

            <div className="flex items-center p-1 rounded-xl bg-bg-surface border border-subtle">
              <button
                onClick={() => setActiveTab('calendario')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'calendario'
                    ? 'bg-orange-700 text-white shadow-sm font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                Calendario
              </button>
              <button
                onClick={() => setActiveTab('lista')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'lista'
                    ? 'bg-orange-700 text-white shadow-sm font-bold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                Lista y Detalle
              </button>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate('/admin/clases/crear')}
              className="gap-2 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Nueva clase
            </Button>
          </>
        }
      />
      <div className="w-full flex flex-col p-6 md:p-10 gap-7 max-w-[1840px] mx-auto transition-all animate-fadeIn">
        {/* TAB 1: Calendario — consume sesiones endpoint with real date range */}
        {activeTab === 'calendario' && (
          isLoading ? (
            <EmptyState
              icon={Calendar}
              title="Cargando calendario..."
              message="Por favor esperá unos segundos."
            />
          ) : sesionesFiltered.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No hay sesiones programadas"
              message="No hay sesiones para esta semana. Avanzá a otra semana o creá una nueva clase."
            />
          ) : (
            <ClassCalendarView
              classes={sesionesFiltered}
              diasSemana={diasSemana}
              onSelectClass={(cls) => {
                setSelectedClass(cls)
                setActiveTab('lista')
              }}
              onOpenAttendees={handleOpenAttendees}
              onCancelarSesion={handleCancelarSesion}
            />
          )
        )}

        {/* TAB 2: PANTALLA 2 FIGMA (Vista de Lista y Detalle de Clase) */}
        {activeTab === 'lista' && (
          isLoading ? (
            <EmptyState
              icon={Calendar}
              title="Cargando lista..."
              message="Por favor esperá unos segundos."
            />
          ) : classes.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No hay clases programadas"
              message="Aún no se cargaron clases al calendario."
            />
          ) : (
            <ClassListDetailView
              classes={classes}
              selectedClass={selectedClass}
              onSelectClass={handleSelectClass}
              onOpenAttendees={handleOpenAttendees}
              onEditClass={handleEditClass}
              onDeleteClass={handleDeleteClass}
            />
          )
        )}

        {/* Modal de Asistentes / Inscriptos */}
        <ClassAttendeesModal
          isOpen={isAttendeesModalOpen}
          onClose={() => setIsAttendeesModalOpen(false)}
          selectedClass={classForModal}
          attendees={attendees}
          onToggleStatus={toggleStatus}
          onSave={() => {
            saveAttendees()
            toast.success('Asistencia guardada con éxito')
            setIsAttendeesModalOpen(false)
          }}
        />

        {/* Modal de Cancelar Clase (toda la serie — desde lista) */}
        <CancelarClaseModal
          isOpen={cancelarModalOpen}
          onClose={() => {
            setCancelarModalOpen(false)
            setClaseParaCancelar(null)
          }}
          clase={claseParaCancelar}
          onConfirm={handleConfirmCancelar}
          loading={cancelarClase.isPending}
          confirmados={attendees.filter((a) => a.estado !== 'en_espera')}
          enEspera={attendees.filter((a) => a.estado === 'en_espera')}
        />

        {/* Modal de Cancelar Sesion (con scope: solo_esta / esta_y_siguientes / toda) */}
        <CancelarSesionModal
          isOpen={cancelarSesionModalOpen}
          onClose={() => {
            setCancelarSesionModalOpen(false)
            setSesionParaCancelar(null)
          }}
          sesion={sesionParaCancelar}
          onConfirm={handleConfirmCancelarSesion}
          loading={cancelarSesion.isPending}
        />
      </div>
    </AppLayout>
  )
}
