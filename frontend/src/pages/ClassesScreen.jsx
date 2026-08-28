import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../components/layout/AppLayout'
import ClassCalendarView from '../components/classes/ClassCalendarView'
import ClassListDetailView from '../components/classes/ClassListDetailView'
import ClassAttendeesModal from '../components/classes/ClassAttendeesModal'
import { useClassAttendees } from '../hooks/useClassAttendees'
import {
  getStoredClasses,
  deleteStoredClass,
} from '../services/adminMockData'

export default function ClassesScreen() {
  const navigate = useNavigate()
  const [classes, setClasses] = useState(getStoredClasses)
  const [activeTab, setActiveTab] = useState('calendario') // 'calendario' | 'lista'
  const [selectedClass, setSelectedClass] = useState(classes[0] || null)
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false)
  const [classForModal, setClassForModal] = useState(null)
  const [currentWeekIndex, setCurrentWeekIndex] = useState(0)

  const {
    attendees,
    toggleStatus,
    saveAttendees,
  } = useClassAttendees(classForModal?.id)

  const semanas = [
    'Semana del 1 al 6 de Junio',
    'Semana del 8 al 13 de Junio',
    'Semana del 15 al 20 de Junio',
    'Semana del 22 al 27 de Junio',
  ]

  const handleOpenAttendees = (cls) => {
    setClassForModal(cls)
    setIsAttendeesModalOpen(true)
  }

  const handleSelectClass = (cls) => {
    setSelectedClass(cls)
  }

  const handleEditClass = (cls) => {
    navigate(`/clases/crear?id=${cls.id}`)
  }

  const handleDeleteClass = (cls) => {
    const updated = deleteStoredClass(cls.id)
    setClasses(updated)
    if (selectedClass?.id === cls.id) {
      setSelectedClass(updated[0] || null)
    }
    toast.info(`Clase "${cls.nombre}" eliminada correctamente`)
  }

  return (
    <AppLayout>
      {/* Figma Container Style: padding: 40px, gap: 28px, max-width 1840px / 1920px */}
      <div className="w-full flex-1 flex flex-col p-6 md:p-10 gap-7 overflow-y-auto max-w-[1840px] mx-auto transition-all animate-fadeIn">
        
        {/* Main Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
              {activeTab === 'calendario' ? 'Calendario de clases' : 'Gestión de Clases'}
            </h1>
            <p className="text-xs md:text-sm text-text-secondary mt-1 font-medium">
              {classes.length} clases programadas · {semanas[currentWeekIndex]}
            </p>
          </div>

          {/* Controls: Week navigator + View Switcher + New Class */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Week navigation (Figma Pantalla 1) */}
            {activeTab === 'calendario' && (
              <div className="flex items-center gap-1 bg-bg-surface border border-subtle rounded-xl p-1">
                <button
                  onClick={() => setCurrentWeekIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentWeekIndex === 0}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sem ant.</span>
                </button>
                <span className="px-2 text-xs font-bold text-text-primary">
                  {currentWeekIndex + 1}/4
                </span>
                <button
                  onClick={() => setCurrentWeekIndex((prev) => Math.min(semanas.length - 1, prev + 1))}
                  disabled={currentWeekIndex === semanas.length - 1}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-bg-raised disabled:opacity-40 transition-colors"
                >
                  <span className="hidden sm:inline">Sem sig.</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* View Switcher Tabs (Calendario / Lista y Detalle) */}
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

            {/* New Class Button (Figma) */}
            <button
              onClick={() => navigate('/clases/crear')}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Nueva clase
            </button>
          </div>
        </div>

        {/* TAB 1: PANTALLA 1 FIGMA (Calendario Semanal de Clases) */}
        {activeTab === 'calendario' && (
          <ClassCalendarView
            classes={classes}
            onSelectClass={(cls) => {
              setSelectedClass(cls)
              setActiveTab('lista')
            }}
            onOpenAttendees={handleOpenAttendees}
          />
        )}

        {/* TAB 2: PANTALLA 2 FIGMA (Vista de Lista y Detalle de Clase) */}
        {activeTab === 'lista' && (
          <ClassListDetailView
            classes={classes}
            selectedClass={selectedClass}
            onSelectClass={handleSelectClass}
            onOpenAttendees={handleOpenAttendees}
            onEditClass={handleEditClass}
            onDeleteClass={handleDeleteClass}
          />
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
      </div>
    </AppLayout>
  )
}
