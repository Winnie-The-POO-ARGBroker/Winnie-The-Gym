import { useState, useEffect } from 'react'
import { Plus, Copy, LayoutGrid, Table, Check, AlertCircle, CreditCard } from 'lucide-react'
import { toast } from 'sonner'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import PlanCard from '../../components/admin/PlanCard'
import PlanDistributionChart from '../../components/admin/PlanDistributionChart'
import PlanComparativeTable from '../../components/admin/PlanComparativeTable'
import PlanFormModal from '../../components/admin/PlanFormModal'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import api from '../../services/api'

const IS_DEV = import.meta.env.DEV

export default function AdminPlanesPage() {
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('tarjetas') // 'tarjetas' | 'comparativa'
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState({ planToEdit: null, isDuplicate: false })
  const [selectedPlanForDuplicate, setSelectedPlanForDuplicate] = useState(null)

  const fetchPlanes = async () => {
    try {
      const response = await api.get('/memberships/planes/')
      setPlanes(response.data.results || response.data)
    } catch (error) {
      console.error('Error fetching planes:', error)
      toast.error('Error al cargar planes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlanes()
  }, [])

  const activePlansCount = planes.filter((p) => p.activo).length
  const totalSocios = planes.reduce((acc, p) => acc + (p.socios_activos || 0), 0)

  // Handle Save (Create or Edit)
  const handleSavePlan = async (planData) => {
    try {
      if (planData.id) {
        // Edit
        await api.patch(`/memberships/planes/${planData.id}/`, planData)
        toast.success(`Plan "${planData.nombre}" actualizado con éxito`)
      } else {
        // Create
        await api.post('/memberships/planes/', {
          ...planData,
          activo: true
        })
        toast.success(`Plan "${planData.nombre}" creado exitosamente`)
      }
      fetchPlanes()
    } catch (error) {
      console.error('Error saving plan:', error)
      toast.error('Error al guardar el plan')
    }
  }

  // Handle Delete
  const handleDeletePlan = async (plan) => {
    if (planes.length <= 1) {
      toast.error('Debe existir al menos un plan activo en el sistema')
      return
    }
    try {
      await api.delete(`/memberships/planes/${plan.id}/`)
      toast.info(`Plan "${plan.nombre}" eliminado`)
      fetchPlanes()
    } catch (error) {
      console.error('Error deleting plan:', error)
      toast.error('Error al eliminar el plan')
    }
  }

  // Handle Archive / Toggle Active
  const handleArchivePlan = async (plan) => {
    try {
      await api.patch(`/memberships/planes/${plan.id}/`, { activo: !plan.activo })
      toast.success(`Plan "${plan.nombre}" ${plan.activo ? 'archivado' : 'activado'}`)
      fetchPlanes()
    } catch (error) {
      console.error('Error toggling plan:', error)
      toast.error('Error al archivar/activar el plan')
    }
  }

  // Quick duplicate trigger
  const handleOpenDuplicate = () => {
    const planToClone = planes.find((p) => p.es_popular) || planes[0] || {}
    setModalMode({ planToEdit: planToClone, isDuplicate: true })
    setIsModalOpen(true)
  }

  return (
    <AppLayout>
      <TopBar
        title={activeTab === 'tarjetas' ? 'Planes de membresía' : 'Comparativa de planes'}
        subtitle={`${activePlansCount} planes activos · ${totalSocios.toLocaleString('es-AR')} socios`}
        rightContent={
          <>
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
            <button
              onClick={handleOpenDuplicate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-bg-surface border border-subtle hover:bg-bg-raised text-text-primary text-xs font-semibold transition-colors"
            >
              <Copy className="w-4 h-4 text-text-secondary" />
              Duplicar
            </button>
            <Button
              variant="primary"
              onClick={() => {
                setModalMode({ planToEdit: null, isDuplicate: false })
                setIsModalOpen(true)
              }}
              className="gap-2 shadow-md shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Nuevo plan
            </Button>
          </>
        }
      />
      <div className="w-full flex-1 flex flex-col p-6 md:p-10 gap-7 overflow-y-auto max-w-[1840px] mx-auto transition-all animate-fadeIn">
        {/* TAB 1: PANTALLA 1 FIGMA (Tarjetas de Planes + Distribución de Socios) */}
        {activeTab === 'tarjetas' && (
          !IS_DEV && planes.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No hay planes disponibles"
              message="Aún no se configuraron planes de membresía."
            />
          ) : (
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
          )
        )}

        {/* TAB 2: PANTALLA 2 FIGMA (Comparativa de Planes) */}
        {activeTab === 'comparativa' && (
          !IS_DEV && planes.length === 0 ? (
            <EmptyState
              icon={CreditCard}
              title="No hay planes disponibles"
              message="Aún no se configuraron planes de membresía."
            />
          ) : (
            <div className="flex flex-col gap-6 w-full">
              <PlanComparativeTable
                planes={planes}
                onCreateNew={() => {
                  setModalMode({ planToEdit: null, isDuplicate: false })
                  setIsModalOpen(true)
                }}
              />
            </div>
          )
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
