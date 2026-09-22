import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { crearPreferencia, resolverInitPoint, cobrarManual } from '../../services/pagosService'
import api from '../../services/api'

// ─── Queries ───────────────────────────────────────────────────────────────────

export const PAGOS_POR_SOCIO_KEY = (socioId) => ['pagos', 'porSocio', socioId]

/**
 * Fetch pagos for a specific socio (admin/recep use — for SocioDetailModal).
 */
export function usePagosPorSocio(socioId, options = {}) {
  return useQuery({
    queryKey: PAGOS_POR_SOCIO_KEY(socioId),
    queryFn: async () => {
      const res = await api.get('/payments/pagos/', { params: { socio_id: socioId } })
      return res.data?.results ?? res.data ?? []
    },
    enabled: !!socioId,
    retry: 1,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.detail ?? err?.response?.data?.message ?? fallback
}

/**
 * Mutation: create a MercadoPago preference for a plan and redirect to checkout.
 * Handles the window.location.href redirect internally.
 */
export function useCrearPreferenciaMutation() {
  return useMutation({
    mutationFn: (planId) => crearPreferencia(planId),
    onSuccess: (preferencia) => {
      const url = resolverInitPoint(preferencia)
      if (!url) {
        toast.error('No se obtuvo una URL de pago válida. Contactá a recepción.')
        return
      }
      window.location.href = url
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al iniciar el pago. Intentá nuevamente.'))
    },
  })
}

/**
 * Mutation: register a manual payment and activate the membership.
 * Returns the created Pago object.
 */
export function useCobrarManualMutation(options = {}) {
  return useMutation({
    mutationFn: (payload) => cobrarManual(payload),
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al registrar el cobro'))
    },
    ...options,
  })
}
