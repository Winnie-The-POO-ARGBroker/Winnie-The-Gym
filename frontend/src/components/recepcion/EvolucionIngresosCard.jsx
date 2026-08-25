import Card from '../ui/Card';

export default function EvolucionIngresosCard({ chartPoints, estesMes, vsAnterior }) {
  return (
    <Card className="flex flex-col min-h-[300px] p-6">
      <h3 className="font-semibold text-text-primary mb-1">Evolución de ingresos</h3>
      <p className="text-sm text-text-secondary mb-6">Recaudación mensual</p>

      <div className="flex-1 flex items-center justify-center relative mb-8">
        <svg viewBox="0 0 400 100" className="w-full h-full overflow-visible">
          <path
            d={chartPoints}
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-success-500"
          />
        </svg>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Este mes</p>
          <p className="text-3xl font-bold text-success-500">{estesMes}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">VS. Anterior</p>
          <p className="text-2xl font-bold text-success-500">{vsAnterior}</p>
        </div>
      </div>
    </Card>
  );
}
