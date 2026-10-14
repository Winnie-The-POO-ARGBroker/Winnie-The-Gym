import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { IdCard, RefreshCw } from 'lucide-react'
import MemberLayout from '../../components/layout/MemberLayout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import MembershipExpiredAlert from '../../components/socio/MembershipExpiredAlert'
import PagoResultadoBanner from '../../components/socio/PagoResultadoBanner'
import MemberCardHeader from '../../components/socio/MemberCardHeader'
import QRDisplay from '../../components/socio/QRDisplay'
import MemberPlanDetails from '../../components/socio/MemberPlanDetails'
import QRFullscreenModal from '../../components/socio/QRFullscreenModal'
import EmptyState from '../../components/ui/EmptyState'
import HighContrastToggle from '../../components/ui/HighContrastToggle'
import useAuth from '../../hooks/useAuth'
import EstadoBanner from '../../components/socio/EstadoBanner'
import { useSocioMembresiaMe } from '../../hooks/queries/useMembresias'
import useScreenWakeLock from '../../hooks/useScreenWakeLock'
import useCredentialState from '../../hooks/useCredentialState'
import { useGymConfig } from '../../hooks/queries/useGymConfig'

export default function CredencialDigitalPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const { data: gymConfig } = useGymConfig()

  // Capture pago result on first render (avoids StrictMode race condition)
  const [pagoResultado] = useState(() => searchParams.get('pago'))

  // Clean the query param once read
  useEffect(() => {
    if (pagoResultado) {
      setSearchParams((prev) => {
        prev.delete('pago')
        return prev
      }, { replace: true })
    }
  }, [pagoResultado, setSearchParams])

  // Fetch socio membership via React Query
  const { data: rawProfile, isLoading } = useSocioMembresiaMe()

  // Map API data to the shape the UI components expect
  const member = useMemo(() => {
    if (!rawProfile) return null
    return {
      ...rawProfile,
      socioNumero: rawProfile.numero_socio,
      sedeHabitual: gymConfig?.nombre_gimnasio ?? null,
      membresia: rawProfile.membresia_activa
        ? {
            ...rawProfile.membresia_activa,
            planNombre: rawProfile.membresia_activa.plan?.nombre,
            fechaVencimiento: rawProfile.membresia_activa.fecha_fin,
          }
        : null,
    }
  }, [rawProfile, gymConfig])

  const isExpired = !member?.membresia || member.membresia.estado === 'vencida'
  const memberReady = Boolean(member && !isExpired)

  // QR credential state — uses the new hook that handles expires_at, visibilitychange, stale overlay
  const { qrToken, timeLeft, maxTime, isRefreshing, isStale, credentialState, refresh } =
    useCredentialState({ enabled: Boolean(member) })

  const hasValidQR = Boolean(memberReady && qrToken)

  // Wake Lock API — only when a valid QR is presented
  useScreenWakeLock({ enabled: hasValidQR })

  if (isLoading) {
    return (
      <MemberLayout title="Credencial Digital" subtitle="Acceso al gimnasio por molinete">
        <div className="flex justify-center p-8">Cargando...</div>
      </MemberLayout>
    )
  }

  if (!member) {
    // Admin and recepcionista should not see the credential page — redirect them
    if (user?.rol === 'administrador' || user?.rol === 'recepcionista') {
      navigate('/dashboard', { replace: true })
      return null
    }
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

  // Credential disabled state — render motivo + CTA from backend (#157)
  if (credentialState && credentialState.habilitado === false) {
    return (
      <MemberLayout
        member={member}
        title="Credencial Digital"
        subtitle="Acceso al gimnasio por molinete"
        rightAction={<HighContrastToggle />}
      >
        <Card className="p-6 flex flex-col gap-4 border-error-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-error-500/10 flex items-center justify-center">
              <IdCard className="w-5 h-5 text-error-500" />
            </div>
            <div>
              <p className="text-sm font-bold text-error-500">Acceso no disponible</p>
              <p className="text-xs text-text-secondary mt-0.5">
                {credentialState.motivo === 'membresia_vencida' && 'Tu membresía está vencida.'}
                {credentialState.motivo === 'socio_suspendido' && 'Tu cuenta está suspendida.'}
                {credentialState.motivo === 'socio_baja' && 'Tu cuenta ha sido dada de baja.'}
                {credentialState.motivo === 'sin_plan' && 'No tenés un plan activo.'}
                {!['membresia_vencida', 'socio_suspendido', 'socio_baja', 'sin_plan'].includes(credentialState.motivo) &&
                  'Consultá con recepción para más información.'}
              </p>
            </div>
          </div>
          {credentialState.cta && (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate(credentialState.cta.href)}
              className="w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              {credentialState.cta.label}
            </Button>
          )}
        </Card>
      </MemberLayout>
    )
  }

  return (
    <MemberLayout
      member={member}
      title="Credencial Digital"
      subtitle="Acceso al gimnasio por molinete"
      rightAction={<HighContrastToggle />}
    >
      <div className="credencial-page flex flex-col gap-3 w-full animate-fadeIn">

        {/* Estado suspendido / baja */}
        {user?.estado && user.estado !== 'activo' && (
          <EstadoBanner estado={user.estado} motivo={user.motivo_suspension} />
        )}

        {/* Banner de resultado del pago — se muestra al volver de MercadoPago */}
        {pagoResultado && (
          <PagoResultadoBanner estado={pagoResultado} />
        )}

        {/* Alerta de Membresía Vencida */}
        {isExpired && (
          <MembershipExpiredAlert fechaVencimiento={member.membresia?.fechaVencimiento} />
        )}

        {/* CTA Renovar — only when membership is expired or missing */}
        {isExpired && (
          <Card className="p-4 flex flex-col gap-3 border-primary/30">
            <div>
              <p className="text-sm font-semibold text-text-primary">Renovar membresía</p>
              {member.membresia?.fechaVencimiento && (
                <p className="text-xs text-text-secondary mt-0.5">
                  Venció el{' '}
                  {new Date(member.membresia.fechaVencimiento).toLocaleDateString('es-AR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              )}
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/socio/checkout')}
              className="w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Renovar ahora
            </Button>
          </Card>
        )}

        {/* Fecha de vencimiento prominente para membresía activa */}
        {!isExpired && member.membresia?.fechaVencimiento && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-success-500/10 border border-success-500/20">
            <span className="text-xs font-semibold text-success-500">Membresía activa hasta</span>
            <span className="text-sm font-bold text-text-primary">
              {new Date(member.membresia.fechaVencimiento).toLocaleDateString('es-AR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </span>
          </div>
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
            qrToken={qrToken}
            timeLeft={timeLeft}
            maxTime={maxTime}
            isRefreshing={isRefreshing}
            isExpired={isExpired}
            isStale={isStale}
            onRefresh={() => refresh(true)}
            onOpenFullscreen={() => setIsFullscreen(true)}
          />

          {/* DETALLES DEL PLAN */}
          {member.membresia && (
            <MemberPlanDetails membresia={member.membresia} />
          )}
        </Card>

        {/* CARD INFORMACIÓN ADICIONAL — only show "Sede" if gymConfig.nombre_gimnasio is available */}
        <Card className="p-4 flex flex-col gap-2 text-xs">
          {member.sedeHabitual && (
            <>
              <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
                Sede Habilitada
              </span>
              <div className="flex items-center justify-between text-text-primary font-medium pt-1">
                <span>{member.sedeHabitual}</span>
                <span className="text-primary text-[11px] font-semibold">{member.membresia?.planNombre || 'Sin Plan'}</span>
              </div>
            </>
          )}
          {!member.sedeHabitual && (
            <div className="flex items-center justify-between text-text-primary font-medium">
              <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">Plan activo</span>
              <span className="text-primary text-[11px] font-semibold">{member.membresia?.planNombre || 'Sin Plan'}</span>
            </div>
          )}
        </Card>

      </div>

      {/* MODAL QR PANTALLA COMPLETA */}
      {qrToken && (
        <QRFullscreenModal
          isOpen={isFullscreen}
          onClose={() => setIsFullscreen(false)}
          member={member}
          qrToken={qrToken}
          timeLeft={timeLeft}
          isExpired={isExpired}
        />
      )}
    </MemberLayout>
  )
}
