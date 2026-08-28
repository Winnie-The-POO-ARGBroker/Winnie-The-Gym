import AforoCard from '../AforoCard'
import MovementList from '../MovementList'
import Button from '../../ui/Button'

export default function RecepcionistaDashboardView({ navigate, mockMovements }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-4 shadow-sm">
          <div>
            <h3 className="font-bold text-lg text-text-primary">Escanear Ingreso</h3>
            <p className="text-xs text-text-secondary mt-1">
              Validar QR digital de socio en menos de 2 segundos.
            </p>
          </div>
          <Button variant="primary" onClick={() => navigate('/recepcion/acceso')}>
            Abrir Terminal QR
          </Button>
        </div>

        <div className="p-5 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-4 shadow-sm">
          <div>
            <h3 className="font-bold text-lg text-text-primary">Registrar Nuevo Socio</h3>
            <p className="text-xs text-text-secondary mt-1">
              Dar de alta cliente y adjuntar certificado médico.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/recepcion/socios')}>
            Registrar Socio
          </Button>
        </div>

        <div className="p-5 rounded-2xl bg-bg-surface border border-subtle flex flex-col justify-between gap-4 shadow-sm">
          <div>
            <h3 className="font-bold text-lg text-text-primary">Monitor de Aforo</h3>
            <p className="text-xs text-text-secondary mt-1">
              Control de ocupación y capacidad en vivo.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/recepcion/aforo')}>
            Ver Monitor Completo
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <AforoCard current={150} max={200} entries={232} exits={76} />
        <MovementList movements={mockMovements} />
      </div>
    </div>
  )
}
