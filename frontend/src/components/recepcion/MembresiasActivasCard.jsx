import Card from '../ui/Card';

export default function MembresiasActivasCard({ activas, porVencer, nuevasMes }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-text-primary mb-6">Membresías activas</h3>
      <div className="grid grid-cols-3 gap-4">
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
          <p className="text-2xl font-bold text-blue-500">+{nuevasMes}</p>
        </div>
      </div>
    </Card>
  );
}
