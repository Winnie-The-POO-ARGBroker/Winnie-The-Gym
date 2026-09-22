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
import EmptyState from '../components/ui/EmptyState'
import Button from '../components/ui/Button'
import { useClasesList, useClasesMutations } from '../hooks/queries/useClases'
import { useClassAttendees } from '../hooks/queries/useClassAttendees'

export default function ClassSchedulePage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('calendario') // 'calendario' | 'lista'
  const [selectedClass, setSelectedClass] = useState(null)
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false)
  const [classForModal, setClassForModal] = useState(null)
  const [weekOffset, setWeekOffset] = useState(0)
  const [cancelarModalOpen, setCancelarModalOpen] = useState(false)
  const [claseParaCancelar, setClaseParaCancelar] = useState(null)

  const { data: classes = [], isLoading } = useClasesList()
  const { cancelar: cancelarClase } = useClasesMutations()

  const {
    attendees,
    toggleStatus,
    saveAttendees,
  } = useClassAttendees(classForModal?.id)

  const { diasSemana, weekLabel } = useMemo(() => {
    // Generar fechas de la semana actual + offset
    const today = new Date()
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay() // Lunes = 1, Domingo = 7
    
    // Lunes de la semana seleccionada
    const monday = new Date(today)
    monday.setDate(today.getDate() - dayOfWeek + 1 + (weekOffset * 7))

    const calculatedDiasSemana = [
      { key: 'Lunes', diaNum: 1, label: 'Lunes', short: 'Lun' },
      { key: 'Martes', diaNum: 2, label: 'Martes', short: 'Mar' },
      { key: 'Miércoles', diaNum: 3, label: 'Miércoles', short: 'Mié' },
      { key: 'Jueves', diaNum: 4, label: 'Jueves', short: 'Jue' },
      { key: 'Viernes', diaNum: 5, label: 'Viernes', short: 'Vie' },
      { key: 'Sábado', diaNum: 6, label: 'Sábado', short: 'Sáb' },
    ].map((d, index) => {
      const dDate = new Date(monday)
      dDate.setDate(monday.getDate() + index)
      const options = { day: '2-digit', month: 'short' }
      let fechaStr = dDate.toLocaleDateString('es-ES', options).replace('.', '')
      fechaStr = fechaStr.charAt(0).toUpperCase() + fechaStr.slice(1)
      return { ...d, fecha: fechaStr }
    })

    // Sábado de la semana seleccionada
    const saturday = new Date(monday)
    saturday.setDate(monday.getDate() + 5)
    const startDay = monday.getDate()
    const endDay = saturday.getDate()
    const monthName = saturday.toLocaleDateString('es-ES', { month: 'long' })
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1)
    
    const calculatedWeekLabel = `Semana del ${startDay} al ${endDay} de ${capitalizedMonth}`
    return { diasSemana: calculatedDiasSemana, weekLabel: calculatedWeekLabel }
  }, [weekOffset])

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
        subtitle={`${classes.length} clases programadas · ${weekLabel}`}
        rightContent={
          <>
            {activeTab === 'calendario' && (
              <div className="flex items-center gap-1 bg-bg-surface border border-subtle rounded-xl p-1">
                <button
                  onClick={() => setWeekOffset((prev) => prev - 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sem ant.</span>
                </button>
                <span className="px-2 text-xs font-bold text-text-primary">
                  {weekOffset === 0 ? 'Hoy' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}
                </span>
                <button
                  onClick={() => setWeekOffset((prev) => prev + 1)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised transition-colors"
                >
                  <span className="hidden sm:inline">Sem sig.</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="flex items-center p-1 rounded-xl bg-bg-surface border border-subtle">
              <button
                onClick={() => setActiveTab('calendario')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'calendario'
                    ? 'bg-primary text-white shadow-sm font-bold'
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
                    ? 'bg-primary text-white shadow-sm font-bold'
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
        {/* TAB 1: PANTALLA 1 FIGMA (Calendario Semanal de Clases) */}
        {activeTab === 'calendario' && (
          isLoading ? (
            <EmptyState
              icon={Calendar}
              title="Cargando calendario..."
              message="Por favor esperá unos segundos."
            />
          ) : classes.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No hay clases programadas"
              message="Aún no se cargaron clases al calendario."
            />
          ) : (
            <ClassCalendarView
              classes={classes}
              diasSemana={diasSemana}
              onSelectClass={(cls) => {
                setSelectedClass(cls)
                setActiveTab('lista')
              }}
              onOpenAttendees={handleOpenAttendees}
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

        {/* Modal de Cancelar Clase */}
        <CancelarClaseModal
          isOpen={cancelarModalOpen}
          onClose={() => {
            setCancelarModalOpen(false)
            setClaseParaCancelar(null)
          }}
          clase={claseParaCancelar}
          onConfirm={handleConfirmCancelar}
          loading={cancelarClase.isPending}
        />
      </div>
    </AppLayout>
  )
}
