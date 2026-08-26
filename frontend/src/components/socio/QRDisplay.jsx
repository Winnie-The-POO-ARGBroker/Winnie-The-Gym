import Button from '../ui/Button'
import QRCode from './QRCode'

export default function QRDisplay({
  qrToken,
  timeLeft,
  maxTime,
  isRefreshing,
  isExpired,
  onRefresh,
  onOpenFullscreen,
}) {
  const progressPercent = ((maxTime - timeLeft) / maxTime) * 100
  const strokeDashoffset = 100 - progressPercent

  return (
    <div className="my-4 flex flex-col items-center justify-center">
      <div
        className={`p-3.5 rounded-xl transition-all relative ${
          isExpired
            ? 'bg-bg-raised border border-error-500/40 opacity-70'
            : 'bg-white shadow-lg ring-4 ring-primary/20'
        }`}
      >
        <QRCode
          value={qrToken}
          size={170}
          fgColor={isExpired ? '#666666' : '#121212'}
          bgColor="#FFFFFF"
          includeLogo={!isExpired}
        />

        {/* Watermark si está vencida */}
        {isExpired && (
          <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center p-2 text-center">{/* overlay — no token yet */}
            <span className="text-xs font-bold text-error-500 uppercase tracking-wide">
              Acceso Bloqueado
            </span>
            <span className="text-[10px] text-text-secondary mt-0.5">
              Membresía vencida
            </span>
          </div>
        )}
      </div>

      {/* Temporizador de rotación de 30 segundos */}
      <div className="mt-3 flex items-center gap-2.5">
        <div className="relative w-6 h-6 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-text-secondary"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={isExpired ? 'text-neutral-600' : 'text-primary'}
              strokeDasharray="100, 100"
              strokeDashoffset={strokeDashoffset}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute text-[9px] font-mono font-bold text-text-primary">
            {timeLeft}
          </span>
        </div>

        <div className="flex flex-col">
          <span className="text-xs font-medium text-text-primary">
            Token dinámico seguro
          </span>
          <span className="text-[10px] text-text-tertiary">
            Se actualiza automáticamente cada 30s
          </span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isRefreshing ? 'animate-spin text-primary' : ''}
          >
            <path d="M23 4v6h-6M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </Button>
      </div>

      {/* Botón pantalla completa */}
      <Button
        variant="secondary"
        size="md"
        onClick={onOpenFullscreen}
        className="w-full justify-center gap-2 py-2.5 text-xs font-semibold mt-4"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
        Ver QR en pantalla completa
      </Button>
    </div>
  )
}
