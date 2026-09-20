import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../../services/api'
import { CLASES_QUERY_KEYS } from './useClases'

// ─── Mutations ─────────────────────────────────────────────────────────────────

function extractErrorMessage(err, fallback) {
  return err?.response?.data?.detail ?? err?.response?.data?.message ?? fallback
}

/**
 * Mutations for class enrollment: book a spot and cancel a booking.
 * Both mutations invalidate the clases list cache so the UI refreshes counts.
 */
export function useInscripcionesMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: CLASES_QUERY_KEYS.all })

  const inscribir = useMutation({
    mutationFn: (classId) =>
      api.post(`/classes/clases/${classId}/inscribir/`).then((r) => r.data),
    onSuccess: () => {
      invalidate()
      toast.success('¡Cupo reservado con éxito!')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al reservar la clase'))
    },
  })

  const cancelar = useMutation({
    mutationFn: (classId) =>
      api.post(`/classes/clases/${classId}/cancelar/`).then((r) => r.data),
    onSuccess: () => {
      invalidate()
      toast.info('Reserva cancelada correctamente')
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al cancelar reserva'))
    },
  })

  return { inscribir, cancelar }
}
