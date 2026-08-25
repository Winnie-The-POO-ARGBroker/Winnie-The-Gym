import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import MemberLayout from '../../layouts/MemberLayout'
import QRCode from '../../components/socio/QRCode'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { MOCK_MEMBER, generateMockQRToken } from '../../services/socioMockData'

export default function CredencialDigitalPage() {
  // Estado del socio
  // TODO: reemplazar por API real -> GET /api/members/me/
  const member = MOCK_MEMBER
  
  // Estado del QR dinámico
  // TODO: reemplazar por API real -> GET /api/access/qr/generate/
  const [qrData, setQrData] = useState(() => generateMockQRToken(MOCK_MEMBER))
  const [timeLeft, setTimeLeft] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isExpired = member.membresia.estado === 'vencida'

  // Generación y rotación de nuevo token QR dinámico
  const refreshQR = useCallback((manual = false) => {
    setIsRefreshing(true)
    setTimeout(() => {
      // TODO: reemplazar por llamada axios api.get('/access/qr/generate/')
      const newToken = generateMockQRToken(member)
      setQrData(newToken)
      setTimeLeft(30)
      setIsRefreshing(false)
      if (manual) {
        toast.success('Código QR actualizado')
      }
    }, 200)
  }, [member])

  // Temporizador de expiración de 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          refreshQR(false)
          return 30
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [refreshQR])

  // Porcentaje del anillo de progreso
  const progressPercent = ((30 - timeLeft) / 30) * 100
  const strokeDashoffset = 100 - progressPercent

  return (
    <MemberLayout
      member={member}
      title="Credencial Digital"
      subtitle="Acceso al gimnasio por molinete"
    >
      <div className="flex flex-col gap-3 w-full animate-fadeIn">

        {/* Alerta de Membresía Vencida */}
        {isExpired && (
          <div className="p-3 rounded-lg bg-error-500/10 border border-error-500/30 flex items-start gap-2.5">
            <div className="text-error-500 shrink-0 mt-0.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <div className="flex-1">
              <span className="text-[11px] font-bold text-error-500 uppercase tracking-wide block">
                Membresía Vencida
              </span>
              <span className="text-[11px] text-text-secondary leading-tight block mt-0.5">
                Tu plan venció el {member.membresia.fechaVencimiento}. Acercate a recepción para renovar.
              </span>
            </div>
          </div>
        )}

        {/* TARJETA DE CREDENCIAL DIGITAL */}
        <div className="bg-bg-surface border border-subtle rounded-lg p-4 flex flex-col shadow-sm">
          
          {/* Header de la Tarjeta */}
          <div className="flex items-center justify-between pb-3 border-b border-subtle">
            <div className="flex items-center gap-2.5">
              {/* Avatar circular */}
              <div className="w-10 h-10 rounded-full bg-bg-raised border border-strong flex items-center justify-center text-text-tertiary shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>

              <div className="flex flex-col">
                <span className="font-semibold text-sm leading-tight text-text-primary">
                  {member.nombre} {member.apellido}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="font-mono text-[11px] text-text-tertiary">
                    DNI {member.dni}
                  </span>
                  <span className="text-text-tertiary text-xs">•</span>
                  <span className="font-mono text-[11px] text-primary font-semibold">
                    {member.socioNumero}
                  </span>
                </div>
              </div>
            </div>

            <Badge variant={isExpired ? 'danger' : 'live'}>
              {isExpired ? 'Vencida' : 'Activa'}
            </Badge>
          </div>

          {/* CÓDIGO QR DINÁMICO */}
          <div className="my-4 flex flex-col items-center justify-center">
            <div
              className={`p-3.5 rounded-xl transition-all relative ${
                isExpired
                  ? 'bg-bg-raised border border-error-500/40 opacity-70'
                  : 'bg-white shadow-lg ring-4 ring-primary/20'
              }`}
            >
              <QRCode
                value={qrData.qr_token}
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

              <button
                onClick={() => refreshQR(true)}
                disabled={isRefreshing}
                className="p-1.5 rounded bg-bg-raised text-text-secondary hover:text-text-primary transition-all disabled:opacity-50"
                title="Refrescar QR ahora"
                aria-label="Refrescar QR"
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
              </button>
            </div>
          </div>

          {/* BOTÓN PANTALLA COMPLETA */}
          <Button
            variant="secondary"
            size="md"
            onClick={() => setIsFullscreen(true)}
            className="w-full justify-center gap-2 py-2.5 text-xs font-semibold"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
            Ver QR en pantalla completa
          </Button>

          {/* DETALLES DEL PLAN */}
          <div className="mt-3 pt-3 border-t border-subtle grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-bg-raised/60 border border-subtle">
              <span className="text-[10px] text-text-tertiary uppercase font-medium block">
                Plan
              </span>
              <span className="font-semibold text-text-primary block mt-0.5 truncate text-xs">
                {member.membresia.planNombre}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-bg-raised/60 border border-subtle">
              <span className="text-[10px] text-text-tertiary uppercase font-medium block">
                Vencimiento
              </span>
              <span className="font-semibold text-text-primary block mt-0.5 text-xs">
                {member.membresia.fechaVencimiento}
              </span>
            </div>
          </div>
        </div>

        {/* CARD INFORMACIÓN ADICIONAL */}
        <div className="bg-bg-surface border border-subtle rounded-lg p-4 flex flex-col gap-2 shadow-sm text-xs">
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
            Sede Habilitada
          </span>
          <div className="flex items-center justify-between text-text-primary font-medium pt-1">
            <span>{member.sedeHabitual}</span>
            <span className="text-primary text-[11px] font-semibold">Pase Libre</span>
          </div>
        </div>

      </div>

      {/* MODAL QR PANTALLA COMPLETA (Fondo Blanco Puro de Alto Contraste) */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-neutral-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn"
          onClick={() => setIsFullscreen(false)}
        >
          {/* scrim — no overlay token yet */}
          {/* Botón cerrar flotante */}
          <button
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-bg-raised text-white flex items-center justify-center hover:bg-bg-surface transition-colors shadow-lg"
            aria-label="Cerrar pantalla completa"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

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
                value={qrData.qr_token}
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

            <button
              onClick={() => setIsFullscreen(false)}
              className="mt-4 w-full py-2.5 rounded-lg bg-bg-raised text-white font-semibold text-xs hover:bg-bg-surface transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </MemberLayout>
  )
}
