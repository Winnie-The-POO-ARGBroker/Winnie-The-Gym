import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../../services/api'

// ─── Query keys ────────────────────────────────────────────────────────────────
export const SESIONES_QUERY_KEYS = {
  all: ['sesiones'],
  byRange: (fechaDesde, fechaHasta) => ['sesiones', 'range', fechaDesde, fechaHasta],
  detail: (id) => ['sesiones', 'detail', id],
}

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetch sesiones by date range.
 * Maps to GET /api/classes/sesiones/?fecha_desde=X&fecha_hasta=Y
 */
export function useSesionesByRange({ fechaDesde, fechaHasta } = {}, options = {}) {
  return useQuery({
    queryKey: SESIONES_QUERY_KEYS.byRange(fechaDesde, fechaHasta),
    queryFn: async () => {
      const res = await api.get('/classes/sesiones/', {
        params: { fecha_desde: fechaDesde, fecha_hasta: fechaHasta },
      })
      return res.data?.results ?? res.data ?? []
    },
    enabled: !!fechaDesde && !!fechaHasta,
    staleTime: 30_000,
    retry: 1,
    ...options,
  })
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.detail ?? err?.response?.data?.message ?? fallback
}

/**
 * All sesion mutations in one hook.
 * cancelar supports scope: 'solo_esta' | 'esta_y_siguientes' | 'toda'
 */
export function useSesionesMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: SESIONES_QUERY_KEYS.all })

  const cancelarSesion = useMutation({
    mutationFn: ({ id, motivo, scope = 'solo_esta' }) =>
      api.post(`/classes/sesiones/${id}/cancelar/`, { motivo, scope }).then((r) => r.data),
    onSuccess: () => {
      invalidate()
      toast.success('Sesion cancelada correctamente.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al cancelar la sesion'))
    },
  })

  const editarSerie = useMutation({
    mutationFn: ({ id, cambios, alcance = 'solo_esta', fecha_pivote }) =>
      api
        .post(`/classes/clases/${id}/editar-serie/`, { cambios, alcance, fecha_pivote })
        .then((r) => r.data),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['clases'] })
      toast.success('Serie actualizada correctamente.')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al editar la serie'))
    },
  })

  return { cancelarSesion, editarSerie }
}
