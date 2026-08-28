import React, { useState } from 'react'
import { Plus, Copy, LayoutGrid, Table, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../../components/layout/AppLayout'
import PlanCard from '../../components/admin/PlanCard'
import PlanDistributionChart from '../../components/admin/PlanDistributionChart'
import PlanComparativeTable from '../../components/admin/PlanComparativeTable'
import PlanFormModal from '../../components/admin/PlanFormModal'
import {
  getStoredPlanes,
  saveStoredPlanes,
} from '../../services/adminMockData'

export default function AdminPlanesPage() {
  const [planes, setPlanes] = useState(getStoredPlanes)
  const [activeTab, setActiveTab] = useState('tarjetas') // 'tarjetas' | 'comparativa'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState({ planToEdit: null, isDuplicate: false })
  const [selectedPlanForDuplicate, setSelectedPlanForDuplicate] = useState(null)

  const activePlansCount = planes.filter((p) => p.activo).length
  const totalSocios = planes.reduce((acc, p) => acc + (p.socios_activos || 0), 0)

  // Handle Save (Create or Edit)
  const handleSavePlan = (planData) => {
    let updatedPlanes = []
    if (planData.id) {
      // Edit
      updatedPlanes = planes.map((p) => (p.id === planData.id ? { ...p, ...planData } : p))
      toast.success(`Plan "${planData.nombre}" actualizado con éxito`)
    } else {
      // Create or Duplicate
      const newPlan = {
        ...planData,
        id: Date.now(),
        activo: true,
        color: planData.es_popular ? '#FF5722' : '#525252',
      }
      updatedPlanes = [...planes, newPlan]
      toast.success(`Plan "${newPlan.nombre}" creado exitosamente`)
    }
    setPlanes(updatedPlanes)
    saveStoredPlanes(updatedPlanes)
  }

  // Handle Delete
  const handleDeletePlan = (plan) => {
    if (planes.length <= 1) {
      toast.error('Debe existir al menos un plan activo en el sistema')
      return
    }
    const updated = planes.filter((p) => p.id !== plan.id)
    setPlanes(updated)
    saveStoredPlanes(updated)
    toast.info(`Plan "${plan.nombre}" eliminado`)
  }

  // Handle Archive / Toggle Active
  const handleArchivePlan = (plan) => {
    const updated = planes.map((p) =>
      p.id === plan.id ? { ...p, activo: !p.activo } : p
    )
    setPlanes(updated)
    saveStoredPlanes(updated)
    toast.success(`Plan "${plan.nombre}" ${plan.activo ? 'archivado' : 'activado'}`)
  }

  // Quick duplicate trigger
  const handleOpenDuplicate = () => {
    const planToClone = planes.find((p) => p.es_popular) || planes[0]
    setModalMode({ planToEdit: planToClone, isDuplicate: true })
    setIsModalOpen(true)
  }

  return (
    <AppLayout>
      {/* Figma Container Style: padding: 40px, gap: 28px, max-width 1840px / 1920px */}
      <div className="w-full flex-1 flex flex-col p-6 md:p-10 gap-7 overflow-y-auto max-w-[1840px] mx-auto transition-all animate-fadeIn">
        
        {/* Main Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-text-primary tracking-tight">
              {activeTab === 'tarjetas' ? 'Planes de membresía' : 'Comparativa de planes'}
            </h1>
            <p className="text-xs md:text-sm text-text-secondary mt-1 font-medium">
              {activePlansCount} planes activos · {totalSocios.toLocaleString('es-AR')} socios
            </p>
          </div>

          {/* Actions & View Switcher */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-bg-surface border border-subtle">
              <button
                onClick={() => setActiveTab('tarjetas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'tarjetas'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Tarjetas
              </button>
              <button
                onClick={() => setActiveTab('comparativa')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'comparativa'
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Table className="w-3.5 h-3.5" />
                Comparativa
              </button>
            </div>

            {/* Duplicate button (Figma Pantalla 1) */}
            <button
              onClick={handleOpenDuplicate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-surface border border-subtle hover:bg-bg-raised text-text-primary text-xs font-semibold transition-colors"
            >
              <Copy className="w-4 h-4 text-text-secondary" />
              Duplicar
            </button>

            {/* New Plan button (Figma Pantalla 1 y 2) */}
            <button
              onClick={() => {
                setModalMode({ planToEdit: null, isDuplicate: false })
                setIsModalOpen(true)
              }}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Nuevo plan
            </button>
          </div>
        </div>

        {/* TAB 1: PANTALLA 1 FIGMA (Tarjetas de Planes + Distribución de Socios) */}
        {activeTab === 'tarjetas' && (
          <div className="flex flex-col gap-7 w-full">
            {/* Grid of 3 Plan Cards (Figma: Básico, Premium Popular, Gold) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {planes.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onEdit={(p) => {
                    setModalMode({ planToEdit: p, isDuplicate: false })
                    setIsModalOpen(true)
                  }}
                  onArchive={handleArchivePlan}
                  onDelete={handleDeletePlan}
                  onDuplicate={(p) => {
                    setModalMode({ planToEdit: p, isDuplicate: true })
                    setIsModalOpen(true)
                  }}
                />
              ))}
            </div>

            {/* Bottom Chart: Distribución de socios por plan */}
            <PlanDistributionChart planes={planes} />
          </div>
        )}

        {/* TAB 2: PANTALLA 2 FIGMA (Comparativa de Planes) */}
        {activeTab === 'comparativa' && (
          <div className="flex flex-col gap-6 w-full">
            <PlanComparativeTable
              planes={planes}
              onCreateNew={() => {
                setModalMode({ planToEdit: null, isDuplicate: false })
                setIsModalOpen(true)
              }}
            />
          </div>
        )}

        {/* Plan Form Modal (Create / Edit / Duplicate) */}
        <PlanFormModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSavePlan}
          planToEdit={modalMode.planToEdit}
          isDuplicate={modalMode.isDuplicate}
        />
      </div>
    </AppLayout>
  )
}
