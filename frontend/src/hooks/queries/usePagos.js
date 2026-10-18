import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { crearPreferencia, resolverInitPoint, cobrarManual } from '../../services/pagosService'
import api from '../../services/api'
import { formatFecha } from '../../utils/formatDate'

// ─── Queries ───────────────────────────────────────────────────────────────────

export const PAGOS_POR_SOCIO_KEY = (socioId) => ['pagos', 'porSocio', socioId]
export const PAGOS_ADMIN_KEY = (params = {}) => ['pagos', 'admin', params]
export const PAGOS_TOTALES_KEY = (params = {}) => ['pagos', 'totales', params]

/**
 * Fetch all pagos for admin/recep page with filters and pagination.
 */
export function usePagosAdmin(params = {}, options = {}) {
  return useQuery({
    queryKey: PAGOS_ADMIN_KEY(params),
    queryFn: async () => {
      const res = await api.get('/payments/pagos/', { params })
      return res.data
    },
    retry: 1,
    ...options,
  })
}

/**
 * Fetch pagos totales (sum by estado) respecting same filters as the list.
 */
export function usePagosTotales(params = {}, options = {}) {
  return useQuery({
    queryKey: PAGOS_TOTALES_KEY(params),
    queryFn: async () => {
      const res = await api.get('/payments/pagos/totales/', { params })
      return res.data
    },
    retry: 1,
    ...options,
  })
}

/**
 * Fetch pagos for a specific socio (admin/recep use — for SocioDetailModal).
 */
export function usePagosPorSocio(socioId, options = {}) {
  return useQuery({
    queryKey: PAGOS_POR_SOCIO_KEY(socioId),
    queryFn: async () => {
      // Backend filter field is `socio` (not `socio_id` — fix for #187/#225)
      const res = await api.get('/payments/pagos/', { params: { socio: socioId } })
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

/**
 * Mutation: anular an approved payment by ID.
 */
export function useAnularPagoMutation(options = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, motivo }) =>
      api.post(`/payments/pagos/${id}/anular/`, { motivo }),
    onSuccess: (res) => {
      const restaurada = res?.data?.membresia_restaurada
      toast.success(
        restaurada
          ? `Pago anulado. Se restauró la membresía anterior (vigente hasta ${formatFecha(restaurada.fecha_fin)}).`
          : 'Pago anulado correctamente'
      )
      queryClient.invalidateQueries({ queryKey: ['pagos'] })
      if (restaurada) queryClient.invalidateQueries({ queryKey: ['membresias'] })
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al anular el pago'))
    },
    ...options,
  })
}
