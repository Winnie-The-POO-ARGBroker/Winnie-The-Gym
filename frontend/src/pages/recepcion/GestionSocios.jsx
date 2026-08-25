import { useState } from 'react';
import Button from '../../components/ui/Button';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import DatosPersonalesCard from '../../components/recepcion/DatosPersonalesCard';
import PlanPagoCard from '../../components/recepcion/PlanPagoCard';
import SaludCard from '../../components/recepcion/SaludCard';
import SocioResumenSidebar from '../../components/recepcion/SocioResumenSidebar';
import { Check } from 'lucide-react';

export default function GestionSocios() {
  const [formData, setFormData] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    plan: 'Premium',
    cuota: '$ 12.000',
    cobro: '01/06',
    renovacion: 'Automática'
  });

  const onChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <AppLayout>
      <TopBar
        title="Gestión de Socios"
        rightContent={
          <div className="flex gap-3">
            <Button variant="secondary">Cancelar</Button>
            <Button variant="primary" className="gap-2">
              <Check className="w-4 h-4" /> Crear socio
            </Button>
          </div>
        }
      />
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

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
              onSubmit={() => {}}
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
