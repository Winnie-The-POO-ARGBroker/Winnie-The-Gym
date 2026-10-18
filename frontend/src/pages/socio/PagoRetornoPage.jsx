import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  CheckCircle,
  XCircle,
  Clock,
  Banknote,
  AlertCircle,
  Loader2,
  RefreshCw,
  Home,
} from 'lucide-react'
import MemberLayout from '../../components/layout/MemberLayout'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import api from '../../services/api'
import { confirmarPago } from '../../services/pagosService'

/**
 * Maps the 5 backend Pago estados to display config.
 * "confirmando" is a virtual FE-only state for the initial polling wait.
 */
const ESTADO_CONFIG = {
  confirmando: {
    icon: Loader2,
    iconClass: 'text-primary animate-spin',
    cardClass: 'border-primary/30',
    titulo: 'Estamos confirmando tu pago',
    mensaje: 'Esto puede tomar unos segundos. No cerrés esta pantalla.',
    showRetry: false,
    showHome: false,
  },
  aprobado: {
    icon: CheckCircle,
    iconClass: 'text-success-500',
    cardClass: 'border-success-500/30',
    titulo: '¡Pago aprobado!',
    mensaje: 'Tu membresía fue activada. Ya podés ingresar al gimnasio.',
    showRetry: false,
    showHome: true,
  },
  pendiente: {
    icon: Clock,
    iconClass: 'text-warning-500',
    cardClass: 'border-warning-500/30',
    titulo: 'Pago en proceso',
    mensaje: 'Tu pago está siendo revisado por MercadoPago. Te notificaremos por email.',
    showRetry: true,
    showHome: true,
  },
  rechazado: {
    icon: XCircle,
    iconClass: 'text-error-500',
    cardClass: 'border-error-500/30',
    titulo: 'Pago rechazado',
    mensaje: 'No se pudo procesar tu pago. Podés intentar nuevamente.',
    showRetry: true,
    showHome: false,
  },
  cancelado: {
    icon: XCircle,
    iconClass: 'text-error-500',
    cardClass: 'border-error-500/30',
    titulo: 'Pago cancelado',
    mensaje: 'El pago fue cancelado. Podés intentar nuevamente cuando quieras.',
    showRetry: true,
    showHome: true,
  },
  reembolsado: {
    icon: Banknote,
    iconClass: 'text-info-500',
    cardClass: 'border-info-500/30',
    titulo: 'Pago reembolsado',
    mensaje: 'El monto fue reembolsado a tu cuenta. Contactá a recepción para más información.',
    showRetry: false,
    showHome: true,
  },
  error: {
    icon: AlertCircle,
    iconClass: 'text-error-500',
    cardClass: 'border-error-500/30',
    titulo: 'No pudimos verificar el pago',
    mensaje: 'Hubo un problema al consultar el estado. Chequeá tu email o acercate a recepción.',
    showRetry: false,
    showHome: true,
  },
}

const POLL_INTERVAL_MS = 3000
const MAX_POLLS = 8 // 24 seconds total before giving up

const TERMINAL_ESTADOS = ['aprobado', 'rechazado', 'cancelado', 'reembolsado']

export default function PagoRetornoPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // MercadoPago appends payment_id to the back_url. Its `status` query param is never
  // trusted: the result shown always comes from our backend.
  const mpPaymentId = searchParams.get('payment_id') || searchParams.get('collection_id')

  const [estado, setEstado] = useState('confirmando')
  const [pagoId, setPagoId] = useState(null)
  const pollCount = useRef(0)
  const pollingRef = useRef(null)

  /**
   * Resolve our internal Pago ID from the MP payment_id by fetching the recent
   * pagos list and matching on mp_payment_id.
   */
  const resolveInternalPago = useCallback(async () => {
    try {
      const res = await api.get('/payments/pagos/mis-pagos/')
      const pagos = res.data?.results ?? res.data ?? []
      if (mpPaymentId) {
        const found = pagos.find((p) => String(p.mp_payment_id) === String(mpPaymentId))
        if (found) {
          setPagoId(found.id)
          return found.id
        }
      }
      // Fallback: take the most recent pago
      if (pagos.length > 0) {
        setPagoId(pagos[0].id)
        return pagos[0].id
      }
    } catch {
      // non-blocking — polling will handle error state
    }
    return null
  }, [mpPaymentId])

  const pollEstado = useCallback(async (id) => {
    if (!id) return
    try {
      const res = await api.get(`/payments/pagos/${id}/estado/`)
      const serverEstado = res.data?.estado
      if (serverEstado) {
        setEstado(serverEstado)
        // Stop polling if we reach a terminal state
        if (TERMINAL_ESTADOS.includes(serverEstado)) {
          if (pollingRef.current) clearInterval(pollingRef.current)
        }
      }
    } catch {
      pollCount.current += 1
      if (pollCount.current >= MAX_POLLS) {
        setEstado('error')
        if (pollingRef.current) clearInterval(pollingRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      let internalId = null

      // Ask the backend to confirm the payment with MercadoPago instead of waiting for
      // the webhook. If that fails we fall back to polling the pago's estado.
      if (mpPaymentId) {
        try {
          const confirmed = await confirmarPago(mpPaymentId)
          if (cancelled) return
          internalId = confirmed?.id ?? null
          if (internalId) setPagoId(internalId)
          if (confirmed?.estado) {
            setEstado(confirmed.estado)
            if (TERMINAL_ESTADOS.includes(confirmed.estado)) return
          }
        } catch {
          // non-blocking — polling below is the fallback
        }
      }

      if (!internalId) internalId = await resolveInternalPago()
      if (cancelled) return

      // First immediate poll
      if (internalId) {
        await pollEstado(internalId)
        if (cancelled) return
      }

      // Periodic polling
      pollingRef.current = setInterval(async () => {
        pollCount.current += 1
        if (pollCount.current >= MAX_POLLS) {
          clearInterval(pollingRef.current)
          setEstado((prev) => (TERMINAL_ESTADOS.includes(prev) ? prev : 'error'))
          return
        }
        await pollEstado(internalId)
      }, POLL_INTERVAL_MS)
    }

    run()

    return () => {
      cancelled = true
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [mpPaymentId, resolveInternalPago, pollEstado])

  const config = ESTADO_CONFIG[estado] ?? ESTADO_CONFIG.confirmando
  const { icon: Icon, iconClass, cardClass, titulo, mensaje, showRetry, showHome } = config

  return (
    <MemberLayout title="Estado del pago" subtitle="Resultado de tu transacción">
      <div className="flex flex-col gap-4 w-full max-w-md mx-auto animate-fadeIn">
        <Card className={`p-6 flex flex-col items-center gap-4 text-center ${cardClass}`}>
          <Icon className={`w-12 h-12 ${iconClass}`} />

          <div>
            <h2 className="text-lg font-bold text-text-primary">{titulo}</h2>
            <p className="text-sm text-text-secondary mt-1 leading-relaxed">{mensaje}</p>
          </div>

          {pagoId && (
            <p className="text-[10px] text-text-tertiary font-mono">
              Ref. pago #{pagoId}
            </p>
          )}
        </Card>

        <div className="flex flex-col gap-3">
          {showRetry && (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/socio/checkout')}
              className="w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reintentar pago
            </Button>
          )}
          {showHome && (
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/socio/credencial')}
              className="w-full gap-2"
            >
              <Home className="w-4 h-4" />
              Ir a mi credencial
            </Button>
          )}
        </div>
      </div>
    </MemberLayout>
  )
}
