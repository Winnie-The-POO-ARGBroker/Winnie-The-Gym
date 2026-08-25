import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Card from '../ui/Card'

export default function ClassCard({ clase, variant, onBook, onCancel }) {
  if (variant === 'booked') {
    return (
      <Card className="border-primary/40 p-3.5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-primary uppercase">
            {clase.fecha} • {clase.horaInicio}h
          </span>
          <Badge variant="live">Confirmada</Badge>
        </div>

        <div>
          <h3 className="text-sm font-bold text-text-primary">
            {clase.nombre}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            {clase.sala} • {clase.instructor}
          </p>
        </div>

        <div className="pt-2 border-t border-subtle flex items-center justify-between">
          <span className="text-[10px] text-text-tertiary">
            Cancelación permitida hasta 2h antes
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCancel(clase.id)}
            className="text-xs text-error-500 hover:text-error-600 hover:bg-error-500/10 border-error-500/30 py-1"
          >
            Cancelar
          </Button>
        </div>
      </Card>
    )
  }

  // variant === 'catalog'
  const spotsLeft = clase.cuposTotales - clase.cuposReservados
  const isFull = spotsLeft <= 0
  const occupancyRatio = clase.cuposReservados / clase.cuposTotales

  return (
    <Card
      className={`p-3.5 flex flex-col gap-2.5 transition-all ${
        clase.isBooked
          ? 'border-primary/60 ring-1 ring-primary/20'
          : 'hover:border-strong'
      }`}
    >
      {/* Fila Horario y Categoría */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-text-primary font-mono">
            {clase.horaInicio} - {clase.horaFin}
          </span>
          <span className="text-[11px] text-text-tertiary font-mono">
            ({clase.duracionMin}m)
          </span>
        </div>

        <Badge
          variant={
            clase.categoria === 'crossfit' || clase.categoria === 'boxeo'
              ? 'danger'
              : clase.categoria === 'spinning' || clase.categoria === 'hiit'
              ? 'warning'
              : 'success'
          }
        >
          {clase.categoria?.toUpperCase() ?? '—'}
        </Badge>
      </div>

      {/* Título de Clase y Sala */}
      <div>
        <h3 className="text-sm font-bold text-text-primary leading-snug">
          {clase.nombre}
        </h3>
        <p className="text-xs text-text-secondary mt-0.5">
          {clase.sala} • Intensidad {clase.intensidad}
        </p>
      </div>

      {/* Instructor y Cupos */}
      <div className="pt-2 border-t border-subtle flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-bg-raised border border-strong flex items-center justify-center text-[10px] font-bold text-text-primary">
            {clase.instructor?.charAt(0) ?? '?'}
          </div>
          <span className="text-xs font-medium text-text-primary">
            {clase.instructor}
          </span>
        </div>

        {/* Aforo / Cupos */}
        <div className="flex flex-col items-end">
          <span className="text-xs font-medium text-text-secondary">
            {isFull ? (
              <strong className="text-error-500">Cupo Completo</strong>
            ) : (
              <span>
                <strong className="text-text-primary">{spotsLeft}</strong> libres
              </span>
            )}
          </span>
          <div className="w-16 h-1 bg-bg-raised rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${
                isFull
                  ? 'bg-error-500'
                  : occupancyRatio > 0.75
                  ? 'bg-warning-500'
                  : 'bg-success-500'
              }`}
              style={{ width: `${occupancyRatio * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Acción de Reserva */}
      <div className="pt-2 border-t border-subtle flex items-center justify-between">
        {clase.isBooked ? (
          <>
            <div className="flex items-center gap-1 text-xs text-success-500 font-semibold">
              <span>✓ Reservada</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onCancel(clase.id)}
              className="text-xs text-error-500 hover:text-error-600 hover:bg-error-500/10 border-error-500/30 py-1"
            >
              Cancelar
            </Button>
          </>
        ) : (
          <Button
            variant="primary"
            size="sm"
            disabled={isFull}
            onClick={() => onBook(clase.id)}
            className="w-full py-1.5 text-xs font-bold shadow-sm"
          >
            {isFull ? 'Sin cupos disponibles' : 'Reservar mi cupo'}
          </Button>
        )}
      </div>
    </Card>
  )
}
