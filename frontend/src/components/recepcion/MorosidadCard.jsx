import Card from '../ui/Card';

export default function MorosidadCard({ morosos, adeudado, tasa, morosidadPct }) {
  return (
    <Card className="p-6">
      <h3 className="font-semibold text-text-primary mb-6">Morosidad</h3>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Morosos</p>
          <p className="text-3xl font-bold text-error-500 mb-3">{morosos}</p>
          <div className="w-full bg-bg-raised h-1.5 rounded-full overflow-hidden border border-subtle">
            <div className="bg-error-500 h-full" style={{ width: `${morosidadPct}%` }}></div>
          </div>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Adeudado</p>
          <p className="text-2xl font-bold text-text-primary">{adeudado}</p>
        </div>
        <div>
          <p className="text-xs text-text-secondary font-semibold mb-1 uppercase">Tasa</p>
          <p className="text-2xl font-bold text-warning-500">{tasa}</p>
        </div>
      </div>
    </Card>
  );
}
