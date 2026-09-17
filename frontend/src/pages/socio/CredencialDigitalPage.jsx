import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { IdCard } from 'lucide-react'
import MemberLayout from '../../components/layout/MemberLayout'
import Card from '../../components/ui/Card'
import MembershipExpiredAlert from '../../components/socio/MembershipExpiredAlert'
import PagoResultadoBanner from '../../components/socio/PagoResultadoBanner'
import MemberCardHeader from '../../components/socio/MemberCardHeader'
import QRDisplay from '../../components/socio/QRDisplay'
import MemberPlanDetails from '../../components/socio/MemberPlanDetails'
import QRFullscreenModal from '../../components/socio/QRFullscreenModal'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'

export default function CredencialDigitalPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [member, setMember] = useState(null)
  const [qrData, setQrData] = useState(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Leer el resultado del pago que MercadoPago adjunta en el back_url
  const pagoResultado = searchParams.get('pago') // 'success' | 'failure' | 'pending' | null

  // Limpiar el query param de la URL una vez leído para evitar que persista al recargar
  useEffect(() => {
    if (pagoResultado) {
      setSearchParams((prev) => {
        prev.delete('pago')
        return prev
      }, { replace: true })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Obtener perfil del socio
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/memberships/me/')
        const data = res.data
        // Mapear los datos de la API a la estructura que espera la UI
        setMember({
          ...data,
          socioNumero: data.numero_socio,
          sedeHabitual: 'Sede Central', // Hardcoded por ahora
          membresia: data.membresia_activa ? {
            ...data.membresia_activa,
            planNombre: data.membresia_activa.plan?.nombre,
            fechaVencimiento: data.membresia_activa.fecha_fin,
          } : null
        })
      } catch (error) {
        console.error('Error fetching member profile:', error)
        toast.error('Error al cargar perfil')
      } finally {
        setIsLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const refreshQR = useCallback(async (manual = false) => {
    setIsRefreshing(true)
    try {
      const res = await api.get('/access/qr/generate/')
      setQrData(res.data.qr_token)
      setTimeLeft(30)
      if (manual) {
        toast.success('Código QR actualizado')
      }
    } catch (error) {
      console.error('Error al generar QR:', error)
      toast.error('Error al generar QR')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  // Cargar QR inicial cuando el miembro está listo
  useEffect(() => {
    if (member) {
      refreshQR()
    }
  }, [member, refreshQR])

  // Temporizador de expiración de 30 segundos
  useEffect(() => {
    if (!qrData) return

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
  }, [qrData, refreshQR])

  if (isLoading) {
    return (
      <MemberLayout title="Credencial Digital" subtitle="Acceso al gimnasio por molinete">
        <div className="flex justify-center p-8">Cargando...</div>
      </MemberLayout>
    )
  }

  if (!member) {
    return (
      <MemberLayout title="Credencial Digital" subtitle="Acceso al gimnasio por molinete">
        <EmptyState
          icon={IdCard}
          title={user?.rol === 'administrador' ? 'Vista de Administrador' : 'Credencial no disponible'}
          message={user?.rol === 'administrador' ? 'Las credenciales digitales son exclusivas para los socios.' : 'Iniciá sesión para ver tu credencial digital.'}
        />
      </MemberLayout>
    )
  }

  const isExpired = !member.membresia || member.membresia.estado === 'vencida'

  return (
    <MemberLayout
      member={member}
      title="Credencial Digital"
      subtitle="Acceso al gimnasio por molinete"
    >
      <div className="flex flex-col gap-3 w-full animate-fadeIn">

        {/* Banner de resultado del pago — se muestra al volver de MercadoPago */}
        {pagoResultado && (
          <PagoResultadoBanner estado={pagoResultado} />
        )}

        {/* Alerta de Membresía Vencida */}
        {isExpired && (
          <MembershipExpiredAlert fechaVencimiento={member.membresia?.fechaVencimiento} />
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
            qrToken={qrData}
            timeLeft={timeLeft}
            maxTime={30}
            isRefreshing={isRefreshing}
            isExpired={isExpired}
            onRefresh={() => refreshQR(true)}
            onOpenFullscreen={() => setIsFullscreen(true)}
          />

          {/* DETALLES DEL PLAN */}
          {member.membresia && (
            <MemberPlanDetails membresia={member.membresia} />
          )}
        </Card>

        {/* CARD INFORMACIÓN ADICIONAL */}
        <Card className="p-4 flex flex-col gap-2 text-xs">
          <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
            Sede Habilitada
          </span>
          <div className="flex items-center justify-between text-text-primary font-medium pt-1">
            <span>{member.sedeHabitual}</span>
            <span className="text-primary text-[11px] font-semibold">{member.membresia?.planNombre || 'Sin Plan'}</span>
          </div>
        </Card>

      </div>

      {/* MODAL QR PANTALLA COMPLETA */}
      {qrData && (
        <QRFullscreenModal
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          member={member}
          qrToken={qrData}
          timeLeft={timeLeft}
          isExpired={isExpired}
        />
      )}
    </MemberLayout>
  )
}
