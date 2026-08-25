import Button from '../../components/ui/Button';
import FilterButton from '../../components/ui/FilterButton';
import AppLayout from '../../components/layout/AppLayout';
import TopBar from '../../components/layout/TopBar';
import EvolucionIngresosCard from '../../components/recepcion/EvolucionIngresosCard';
import AsistenciaSemanalCard from '../../components/recepcion/AsistenciaSemanalCard';
import MorosidadCard from '../../components/recepcion/MorosidadCard';
import MembresiasActivasCard from '../../components/recepcion/MembresiasActivasCard';
import { Download } from 'lucide-react';

export default function Reportes() {
  const tabs = ['Resumen', 'Morosidad', 'Asistencia', 'Ingresos'];

  return (
    <AppLayout>
      <TopBar
        title="Reportes"
        subtitle="Resumen ejecutivo"
        rightContent={
          <Button variant="primary" className="flex items-center gap-2">
            <Download className="w-4 h-4" /> Exportar PDF
          </Button>
        }
      />
      <div className="flex-1 p-6 overflow-auto flex flex-col gap-6">

        <div className="flex gap-2 mb-8">
          {tabs.map((tab, idx) => (
            <FilterButton key={tab} active={idx === 0} size="md">
              {tab}
            </FilterButton>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <EvolucionIngresosCard
            chartPoints="M 0,60 L 50,70 L 100,50 L 150,60 L 200,40 L 250,55 L 300,30 L 350,45 L 400,20"
            estesMes="$ 4.8M"
            vsAnterior="+12%"
          />
          <AsistenciaSemanalCard
            bars={[40, 60, 55, 75, 85, 60, 45]}
          />
          <MorosidadCard
            morosos={34}
            adeudado="$412k"
            tasa="8.2%"
            morosidadPct={25}
          />
          <MembresiasActivasCard
            activas="1.240"
            porVencer={86}
            nuevasMes={24}
          />
        </div>
      </div>
    </AppLayout>
  );
}
