import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Button from '../../components/ui/Button'
import AppLayout from '../../components/layout/AppLayout'
import TopBar from '../../components/layout/TopBar'
import DatosPersonalesCard from '../../components/recepcion/DatosPersonalesCard'
import PlanPagoCard from '../../components/recepcion/PlanPagoCard'
import SaludCard from '../../components/recepcion/SaludCard'
import SocioResumenSidebar from '../../components/recepcion/SocioResumenSidebar'
import { Check } from 'lucide-react'
import { gestionSociosSchema, defaultValues } from './gestionSocios.schema'

export default function GestionSocios() {
  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(gestionSociosSchema),
    defaultValues,
  })

  const formData = watch()

  const onChange = (field, value) => setValue(field, value)

  const onSubmit = (data) => {
    // Handle form submission with validated data
    console.log('Form submitted:', data)
  }

  return (
    <AppLayout>
      <TopBar
        title="Gestión de Socios"
        rightContent={
          <div className="flex gap-3">
            <Button variant="secondary">Cancelar</Button>
            <Button
              variant="primary"
              className="gap-2"
              onClick={handleSubmit(onSubmit)}
            >
              <Check className="w-4 h-4" /> Crear socio
            </Button>
          </div>
        }
      />
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

        {Object.keys(errors).length > 0 && (
          <div className="mb-4 p-3 rounded-xl bg-bg-raised border border-subtle">
            {Object.values(errors).map((e, i) => (
              <p key={i} className="text-xs text-error-500">{e.message}</p>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
          {/* Form Column */}
          <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-4 custom-scrollbar">
            <DatosPersonalesCard formData={formData} onChange={onChange} />
            <PlanPagoCard formData={formData} onChange={onChange} />
            <SaludCard onFileChange={() => {}} onChange={onChange} />
          </div>

          {/* Resumen Sidebar */}
          <div className="lg:col-span-1">
            <SocioResumenSidebar
              nombre={formData.nombre}
              apellido={formData.apellido}
              dni={formData.dni}
              plan={formData.plan}
              cuota={formData.cuota}
              cobro={formData.cobro}
              renovacion={formData.renovacion}
              onSubmit={handleSubmit(onSubmit)}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
