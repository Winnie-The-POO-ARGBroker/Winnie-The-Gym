import Card from '../ui/Card';

export default function AforoStatBar({
  promedioHoy,
  picoMaximo,
  picoHora,
  ingresoUltimaHora,
  egresoUltimaHora,
}) {
  return (
    <div className="grid grid-cols-4 gap-6">
      <Card className="p-4">
        <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Promedio Hoy</p>
        <p className="text-2xl font-bold text-text-primary">{promedioHoy}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Pico Máximo</p>
        <p className="text-2xl font-bold text-text-primary">
          {picoMaximo} <span className="text-xs text-text-tertiary font-normal">a las {picoHora}</span>
        </p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Ingresos (Última hora)</p>
        <p className="text-2xl font-bold text-success-500">+{ingresoUltimaHora}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Egresos (Última hora)</p>
        <p className="text-2xl font-bold text-error-500">-{egresoUltimaHora}</p>
      </Card>
    </div>
  );
}
