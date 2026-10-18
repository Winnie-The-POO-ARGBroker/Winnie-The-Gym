import Card from '../ui/Card';

export default function MembresiasActivasCard({ activas, porVencer, nuevasMes, renovacionesMes = 0 }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-text-primary mb-6">Membresías activas</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Activas</p>
          <p className="text-3xl font-bold text-success-500">{activas}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Por vencer</p>
          <p className="text-2xl font-bold text-warning-500">{porVencer}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Nuevas/Mes</p>
          <p className="text-2xl font-bold text-info-500">+{nuevasMes}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Renovaciones/Mes</p>
          <p className="text-2xl font-bold text-info-500">{renovacionesMes}</p>
        </div>
      </div>
    </Card>
  );
}
