import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import api from '../../services/api'

// ─── Query keys ────────────────────────────────────────────────────────────────
export const ATTENDEES_QUERY_KEYS = {
  all: ['classAttendees'],
  byClass: (classId) => ['classAttendees', classId],
}

// ─── Query ─────────────────────────────────────────────────────────────────────

/**
 * Fetch the attendees list for a given class ID.
 * Returns the `inscripciones` array from the class detail endpoint.
 */
export function useClassAttendees(classId) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ATTENDEES_QUERY_KEYS.byClass(classId),
    queryFn: async () => {
      const res = await api.get(`/classes/clases/${classId}/`)
      return res.data.inscripciones ?? []
    },
    enabled: !!classId,
    retry: 1,
  })

  // ─── Toggle attendance mutation ─────────────────────────────────────────────
  const toggleMutation = useMutation({
    mutationFn: async ({ attendeeId, newStatus }) => {
      const asistio = newStatus === 'presente'
      const res = await api.patch(`/classes/inscripciones/${attendeeId}/`, { asistio })
      return res.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ATTENDEES_QUERY_KEYS.byClass(classId) })
    },
    onError: (err) => {
      const message =
        err?.response?.data?.detail ?? err?.response?.data?.message ?? 'Error al actualizar asistencia'
      toast.error(message)
    },
  })

  /**
   * Toggle a single attendee's status.
   * @param {number} attendeeId
   * @param {'presente'|'ausente'} newStatus
   */
  const toggleStatus = (attendeeId, newStatus) =>
    toggleMutation.mutate({ attendeeId, newStatus })

  /**
   * Re-fetch the attendees list manually (e.g. after saving).
   */
  const fetchAttendees = () =>
    qc.invalidateQueries({ queryKey: ATTENDEES_QUERY_KEYS.byClass(classId) })

  /**
   * saveAttendees is kept for API compatibility with ClassAttendeesModal.
   * Calling it triggers a re-fetch to sync local state.
   */
  const saveAttendees = fetchAttendees

  return {
    attendees: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    toggleStatus,
    saveAttendees,
    fetchAttendees,
  }
}
