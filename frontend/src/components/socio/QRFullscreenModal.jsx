import Button from '../ui/Button'
import QRCode from './QRCode'

export default function QRFullscreenModal({
  isOpen,
  onClose,
  member,
  qrToken,
  timeLeft,
  isExpired,
}) {
  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
      onClick={onClose}
    >
      {/* scrim — no overlay token yet */}
      {/* Botón cerrar flotante */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClose}
        className="absolute top-6 right-6"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </Button>

      {/* Tarjeta Blanca de Alto Contraste */}
      <div
        className="w-full max-w-xs bg-white text-neutral-900 rounded-2xl p-6 shadow-2xl flex flex-col items-center text-center animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-text-secondary">
            Winnie The Gym • Molinete
          </span>
        </div>

        <h3 className="text-base font-bold text-neutral-950">
          {member.nombre} {member.apellido}
        </h3>
        <p className="text-[11px] text-text-tertiary font-mono mt-0.5">
          {member.socioNumero} • DNI {member.dni}
        </p>

        {/* QR Maximizado */}
        <div className="my-5 p-3 rounded-lg bg-white border border-neutral-200 shadow-sm">
          <QRCode
            value={qrToken}
            size={220}
            fgColor="#000000"
            bgColor="#FFFFFF"
            includeLogo={!isExpired}
          />
        </div>

        <div className="flex items-center justify-center gap-2 px-3 py-1 rounded-full bg-bg-raised text-text-secondary text-xs font-medium mb-2.5">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          Válido por: <strong className="font-mono text-neutral-900">{timeLeft}s</strong>
        </div>

        <p className="text-[10.5px] text-text-tertiary leading-tight">
          Presentá este código frente al lector óptico del molinete para ingresar. Fondo optimizado al máximo contraste visual.
        </p>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="mt-4 w-full"
        >
          Cerrar
        </Button>
      </div>
    </div>
  )
}
