import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { getStaffList, createStaff, resendActivation } from '../../services/staffService'

// ─── Query keys ──────────────────────────────────────────────
export const STAFF_QUERY_KEYS = {
  all: ['staff'],
  list: () => ['staff', 'list'],
}

/**
 * Helper to extract a readable error message from a DRF error response.
 */
function extractErrorMessage(err, fallback) {
  const data = err?.response?.data
  if (!data) return fallback
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  if (data.email) return Array.isArray(data.email) ? data.email.join(', ') : data.email
  const values = Object.values(data).flat().filter(Boolean)
  return values.length > 0 ? values.join(', ') : fallback
}

/**
 * Query hook: list of all staff users (administrador + recepcionista).
 *
 * @param {Object} [options] - Extra useQuery options
 */
export function useStaffList(options = {}) {
  return useQuery({
    queryKey: STAFF_QUERY_KEYS.list(),
    queryFn: getStaffList,
    staleTime: 30_000,
    ...options,
  })
}

/**
 * Mutation hook: create a new staff user.
 * On success → invalidates list cache + shows a success toast only if the email went out (warning otherwise).
 */
export function useStaffCreate() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data) => createStaff(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: STAFF_QUERY_KEYS.all })
      // The backend reports whether the activation email was really handed to the mail backend
      if (data?.email_enviado === true) {
        toast.success('Staff creado correctamente. Se envió un email de activación.')
      } else {
        toast.warning(
          'Staff creado, pero no se pudo enviar el email de activación. Usá «Reenviar activación» cuando el correo esté configurado.'
        )
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al crear staff'))
    },
  })
}

/**
 * Mutation hook: resend activation email.
 * On success → success toast only if the email went out (warning otherwise).
 */
export function useResendActivation() {
  return useMutation({
    mutationFn: (id) => resendActivation(id),
    onSuccess: (data) => {
      if (data?.email_enviado === true) {
        toast.success('Email de activación reenviado.')
      } else {
        toast.warning(
          'No se pudo reenviar el email de activación. Revisá la configuración del correo e intentá de nuevo.'
        )
      }
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Error al reenviar activación'))
    },
  })
}
