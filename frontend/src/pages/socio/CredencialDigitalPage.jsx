import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { IdCard } from 'lucide-react'
import MemberLayout from '../../layouts/MemberLayout'
import Card from '../../components/ui/Card'
import MembershipExpiredAlert from '../../components/socio/MembershipExpiredAlert'
import MemberCardHeader from '../../components/socio/MemberCardHeader'
import QRDisplay from '../../components/socio/QRDisplay'
import MemberPlanDetails from '../../components/socio/MemberPlanDetails'
import QRFullscreenModal from '../../components/socio/QRFullscreenModal'
import EmptyState from '../../components/ui/EmptyState'
import { MOCK_MEMBER, generateMockQRToken } from '../../services/socioMockData'

const IS_DEV = import.meta.env.DEV

export default function CredencialDigitalPage() {
  // Estado del socio
  // TODO: reemplazar por API real -> GET /api/members/me/
  const member = IS_DEV ? MOCK_MEMBER : null

  // Estado del QR dinámico
  // TODO: reemplazar por API real -> GET /api/access/qr/generate/
  const [qrData, setQrData] = useState(() => IS_DEV ? generateMockQRToken(MOCK_MEMBER) : null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const isExpired = member.membresia.estado === 'vencida'

  // Generación y rotación de nuevo token QR dinámico
  const refreshQR = useCallback((manual = false) => {
    if (!IS_DEV) return
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

  if (!IS_DEV && !member) {
    return (
      <MemberLayout title="Credencial Digital" subtitle="Acceso al gimnasio por molinete">
        <EmptyState
          icon={IdCard}
          title="Credencial no disponible"
          message="Iniciá sesión para ver tu credencial digital."
        />
      </MemberLayout>
    )
  }

  return (
    <MemberLayout
      member={member}
      title="Credencial Digital"
      subtitle="Acceso al gimnasio por molinete"
    >
      <div className="flex flex-col gap-3 w-full animate-fadeIn">

        {/* Alerta de Membresía Vencida */}
        {isExpired && (
          <MembershipExpiredAlert fechaVencimiento={member.membresia.fechaVencimiento} />
        )}

        {/* TARJETA DE CREDENCIAL DIGITAL */}
        <Card className="p-4 flex flex-col">
          
          {/* Header de la Tarjeta */}
          <MemberCardHeader
            nombre={member.nombre}
            apellido={member.apellido}
            dni={member.dni}
            numeroSocio={member.socioNumero}
            isExpired={isExpired}
          />

          {/* CÓDIGO QR DINÁMICO */}
          <QRDisplay
            qrToken={qrData.qr_token}
            timeLeft={timeLeft}
            maxTime={30}
            isRefreshing={isRefreshing}
            isExpired={isExpired}
            onRefresh={() => refreshQR(true)}
            onOpenFullscreen={() => setIsFullscreen(true)}
          />

          {/* DETALLES DEL PLAN */}
          <MemberPlanDetails membresia={member.membresia} />
        </Card>

        {/* CARD INFORMACIÓN ADICIONAL */}
        <Card className="p-4 flex flex-col gap-2 text-xs">
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
            Sede Habilitada
          </span>
          <div className="flex items-center justify-between text-text-primary font-medium pt-1">
            <span>{member.sedeHabitual}</span>
            <span className="text-primary text-[11px] font-semibold">Pase Libre</span>
          </div>
        </Card>

      </div>

      {/* MODAL QR PANTALLA COMPLETA (Fondo Blanco Puro de Alto Contraste) */}
      <QRFullscreenModal
        isOpen={isFullscreen}
        onClose={() => setIsFullscreen(false)}
        member={member}
        qrToken={qrData.qr_token}
        timeLeft={timeLeft}
        isExpired={isExpired}
      />
    </MemberLayout>
  )
}
